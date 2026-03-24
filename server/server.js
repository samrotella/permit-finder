// server.js - Backend API for fetching permit requirements
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cache for permit data to reduce API calls
const permitCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to normalize city and state
function normalizeLocation(city, state) {
  return {
    city: city.trim().toLowerCase(),
    state: state.trim().toUpperCase(),
  };
}

// Generate cache key
function getCacheKey(city, state, projectCategory) {
  const normalized = normalizeLocation(city, state);
  return `${normalized.city}-${normalized.state}-${projectCategory}`;
}

// Save email endpoint
app.post('/api/save-email', async (req, res) => {
  try {
    const { email, city, state, projectCategory, timestamp } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data, error } = await supabase
      .from('user_emails')
      .insert([{ email, city, state, project_category: projectCategory, created_at: timestamp }]);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving email:', error);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

// Main permit requirements endpoint
app.post('/api/permit-requirements', async (req, res) => {
  try {
    const { city, state, projectCategory } = req.body;

    if (!city || !state || !projectCategory) {
      return res.status(400).json({
        error: 'City, state, and project category are required'
      });
    }

    // Check cache first
    const cacheKey = getCacheKey(city, state, projectCategory);
    const cachedData = permitCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log('Returning cached data for:', cacheKey);
      return res.json(cachedData.data);
    }

    // Check database for existing permit data
    const dbData = await getPermitDataFromDB(city, state, projectCategory);
    if (dbData) {
      permitCache.set(cacheKey, { data: dbData, timestamp: Date.now() });
      return res.json(dbData);
    }

    // Fetch from local data or fallback
    const permitData = await fetchPermitData(city, state, projectCategory);

    // Save to database for future use
    await savePermitDataToDB(city, state, projectCategory, permitData);

    // Update cache
    permitCache.set(cacheKey, { data: permitData, timestamp: Date.now() });

    res.json(permitData);
  } catch (error) {
    console.error('Error fetching permit requirements:', error);
    res.status(500).json({
      error: 'Failed to fetch permit requirements',
      message: error.message
    });
  }
});

// Get permit data from database
async function getPermitDataFromDB(city, state, projectCategory) {
  try {
    const normalized = normalizeLocation(city, state);
    const { data, error } = await supabase
      .from('permit_data')
      .select('*')
      .eq('city', normalized.city)
      .eq('state', normalized.state)
      .eq('project_category', projectCategory)
      .single();

    if (error || !data) return null;
    return data.permit_info;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

// Save permit data to database
async function savePermitDataToDB(city, state, projectCategory, permitData) {
  try {
    const normalized = normalizeLocation(city, state);
    const { error } = await supabase
      .from('permit_data')
      .upsert([{
        city: normalized.city,
        state: normalized.state,
        project_category: projectCategory,
        permit_info: permitData,
        last_updated: new Date().toISOString(),
      }], { onConflict: 'city,state,project_category' });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving to database:', error);
  }
}

// Fetch permit data — route to city-specific data or fallback
async function fetchPermitData(city, state, projectCategory) {
  const normalized = normalizeLocation(city, state);

  // Lancaster City, PA
  if (normalized.city === 'lancaster' && normalized.state === 'PA') {
    return getLancasterCityPermitInfo(projectCategory);
  }

  // Harrisburg, PA
  if (normalized.city === 'harrisburg' && normalized.state === 'PA') {
    return getHarrisburgPermitInfo(projectCategory);
  }

  // All other cities — generic fallback
  return getGeneralPermitInfo(city, state, projectCategory);
}


// =============================================================================
// LANCASTER CITY, PA
// =============================================================================
function getLancasterCityPermitInfo(projectCategory) {
  const isResidential = projectCategory === 'Residential';

  return {
    isGeneric: false,
    applicationUrl: isResidential
      ? 'https://www.cityoflancasterpa.gov/wp-content/uploads/2020/02/Residential-Permit-Application-rev-12-19-22.pdf'
      : 'https://www.cityoflancasterpa.gov/building-permits/#docaccess-1bbc24851c398e362210f90a651cfb2a98adb14a0c0637279a08a5afb9aec1c8',
    permitOffice: {
      name: 'Bureau of Building Code Administration',
      phone: '(717) 291-4724',
      email: 'codes@cityoflancasterpa.gov',
      website: 'https://www.cityoflancasterpa.gov/building-permits/',
      address: '120 North Duke Street, Lancaster, PA 17602',
      hours: 'Monday-Friday, 8:30 AM - 4:30 PM',
    },
    requiresPermit: isResidential ? [
      'New construction (one/two-family homes)',
      'Additions (room expansions, garages, sunrooms)',
      'Interior alterations (finish basements, remodel kitchens/bathrooms)',
      'Structural projects (decks, porches, load-bearing walls)',
      'Systems work (plumbing, electrical, mechanical, HVAC)',
      'Pools/spas',
      'Fences',
      'Reroofing',
      'Demolition',
      'Fire/safety systems',
    ] : [
      'New commercial construction',
      'Tenant improvements (interior improvements to commercial spaces)',
      'Additions and structural modifications',
      'Systems work (plumbing, electrical, mechanical, HVAC)',
      'Fire suppression and alarm systems',
      'Signage (separate permit required)',
      'Demolition',
      'Interior demolition (can begin while plans are under review)',
    ],
    noPermitNeeded: isResidential ? [
      'Minor finish work (painting, wallpaper, flooring, cabinetry, countertops)',
      'Exterior siding replacement',
      'Roof repairs (not full replacement of more than 25% of roof area)',
      'Window/door replacements in existing openings without altering framing',
      'Simple fences up to 6 ft tall',
      'Retaining walls up to 4 ft high',
      'Portable structures (play equipment, swing sets, small prefabricated pools under 24")',
      'Minor electrical work (replacing lamps/outlets/switches under 150V)',
    ] : [
      'Minor finish work (painting, flooring, non-structural improvements)',
      'Signage changes within existing sign boxes (electrical work may require permit)',
      'Furniture and fixture installation (non-structural)',
      'Minor repairs that don\'t affect building systems',
    ],
    noPermitNote: isResidential
      ? 'Note: Even if a project is exempt from a building permit, zoning or historic district rules may still apply.'
      : 'Note: Commercial projects often require multiple permits and third-party plan review. Always verify with the Building Code Administration.',
    fees: isResidential ? [
      { type: 'New construction', amount: '$0.45 per sq ft (minimum $150)' },
      { type: 'Renovations & alterations ($300-$4,999)', amount: '$75' },
      { type: 'Renovations & alterations ($5,000-$9,999)', amount: '$150' },
      { type: 'Renovations & alterations ($10,000+)', amount: '$225 + $15 per additional $1,000' },
      { type: 'Single-trade permits ($300-$4,999)', amount: '$50' },
      { type: 'Single-trade permits ($5,000-$9,999)', amount: '$100' },
      { type: 'Single-trade permits ($10,000+)', amount: '$150 + $10 per additional $1,000' },
      { type: 'Electrical service / fire detection system', amount: 'Flat $130' },
      { type: 'State education surcharge (all permits)', amount: '$4.50' },
    ] : [
      { type: 'New construction, additions, accessory structures', amount: '$0.50 per sq ft (minimum $200)' },
      { type: 'Plan review & inspections (third-party)', amount: '$0.065 per sq ft (minimum $500)' },
      { type: 'Alterations ($300-$4,999)', amount: '$150' },
      { type: 'Alterations ($5,000-$9,999)', amount: '$300' },
      { type: 'Alterations ($10,000+)', amount: 'Tiered: 0.15%-0.6% of project value' },
      { type: 'Fire systems & alterations', amount: '$30 per $1,000 of contract value (min $400)' },
      { type: 'Signage (separate permit)', amount: 'Based on valuation' },
      { type: 'Demolition (interior non-structural)', amount: '$195' },
      { type: 'Demolition (full building)', amount: '$250' },
      { type: 'State education surcharge (all permits)', amount: '$4.50' },
    ],
    requiredDocuments: isResidential ? [
      'Completed Residential Building Permit Application',
      'Two (2) copies of construction plans/drawings showing proposed work',
      'Site plan showing property lines, existing structures, proposed construction, and distances to lot lines',
      'Complete applicant information and contact details',
      'Complete property owner information',
      'Complete contractor information including Home Improvement Contractor (HIC) Registration number',
      'Copy of contractor\'s estimate, proposal, or contract',
      'Detailed scope of work narrative',
      'Project cost estimate (including fair market value of labor and materials)',
      'Property owner or authorized agent signature on application',
      'Insurance certificate(s) (if required)',
      'Copy of Zoning Hearing Board decision letter (if applicable)',
      'Copy of Planning Commission decision letter (if applicable)',
    ] : [
      'Completed Commercial Building Permit Application',
      'Three (3) sets of construction plans stamped by a licensed engineer',
      'Site plan showing property lines, existing structures, and proposed construction',
      'Complete applicant information and contact details',
      'Complete property owner information',
      'Licensed contractor information and credentials',
      'Detailed scope of work and specifications',
      'Project cost estimate',
      'Property owner or authorized agent signature',
      'Insurance certificates',
      'Zoning approval (if applicable)',
      'Historic Commission approval (if in historic district)',
      'Fire system plans (separate submission required)',
      'Third-party plan review may be required (City will notify you)',
    ],
    howToApply: isResidential ? [
      'Prepare your documents: Complete the application, gather plans/drawings, contractor info, and project cost estimate',
      'Submit your application in person at 120 N. Duke Street, Lancaster, PA, by mail, or email to codes@cityoflancasterpa.gov (for eligible permit types)',
      'Plan review: City staff will review for compliance with building codes, zoning regulations, and historic overlay (if applicable). Allow up to 15 business days for residential permit review.',
      'Pay permit fees: Once approved, you\'ll receive an invoice. Payment accepted in person or by mail.',
      'Begin construction: Post your permit placard at the job site. Schedule inspections as required (footings, rough-in, framing, final). Building cannot be used or occupied until Certificate of Occupancy is issued.',
    ] : [
      'Pre-application meeting recommended: Contact the Building Code Administration to discuss your project',
      'Prepare engineered plans: All commercial projects require plans stamped by a licensed professional engineer',
      'Submit application: In person at 120 N. Duke Street or by mail. Email submissions may not be accepted for commercial projects.',
      'Third-party review: The City may direct your project to an approved Third Party Code Agency for plan review and inspections. You are responsible for those fees.',
      'Fire systems: All fire systems must be submitted separately using the Fire Systems Permit application',
      'Plan review: Allow 20-30 business days for commercial permit review. Revisions may be required.',
      'Pay fees: Upon approval, you\'ll receive an invoice for City permit fees plus any third-party fees',
      'Begin construction: Permit placard must be posted on site. Schedule inspections through the City or assigned third-party agency.',
      'Certificate of Occupancy: Required before building can be used. Final inspections must pass first.',
    ],
    resources: [
      { name: 'Lancaster Building Permits Website', url: 'https://www.cityoflancasterpa.gov/building-permits/' },
      { name: 'Residential Building Permit Application', url: 'https://www.cityoflancasterpa.gov/wp-content/uploads/2020/02/Residential-Permit-Application-rev-12-19-22.pdf' },
      { name: 'Building Code Fee Schedule', url: 'https://www.cityoflancasterpa.gov/wp-content/uploads/2023/03/PDF-Copy-of-New-Fee-Schedule-2023-117.pdf' },
    ],
    additionalInfo: isResidential
      ? 'All permits are subject to a $4.50 Pennsylvania state education surcharge. Projects may be subject to additional reviews (Engineering, Stormwater, Historic, and/or Zoning) as determined by staff. Always verify requirements with the Bureau of Building Code Administration.'
      : 'Commercial projects require third-party plan review and inspection in most cases. The City maintains a list of approved Third Party Code Agencies. You are responsible for paying third-party fees in addition to City permit fees. All fire system work must be performed by contractors with a Certificate of Fitness from the Fire Bureau. Always verify requirements with the Bureau of Building Code Administration.',
    lastUpdated: new Date().toISOString(),
  };
}


// =============================================================================
// HARRISBURG, PA
// Sources:
//   - Bureau of Codes: harrisburgpa.gov/services/codes/index.php
//   - Building Code (ecode360): ecode360.com/13780116
//   - Electrical Code (ecode360): ecode360.com/13780136
//   - Fee update (Fox43, 2024): fox43.com (new fees effective May 1, 2024)
//   - Forms: harrisburgpa.gov/services/codes/documents_forms.php
// =============================================================================
function getHarrisburgPermitInfo(projectCategory) {
  const isResidential = projectCategory === 'Residential';

  return {
    isGeneric: false,
    applicationUrl: 'https://cms2.revize.com/revize/harrisburgpa/Building%20Permit%20Application%20with%20Instructions%2028MAR25.pdf?t=202505020933100&t=202505020933100',
    permitOffice: {
      name: 'Bureau of Codes',
      phone: '(717) 255-6553',
      email: null,
      website: 'https://harrisburgpa.gov/services/codes/index.php',
      address: 'Martin Luther King Government Center, 10 N 2nd Street, Suite 205, Harrisburg, PA 17101',
      hours: 'Monday-Friday, 8:00 AM - 4:30 PM',
    },
    requiresPermit: isResidential ? [
      'New construction (one/two-family homes)',
      'Additions and structural modifications',
      'Interior alterations and renovations',
      'Decks, porches, and structural additions',
      'Electrical work (requires separate electrical permit and licensed electrician)',
      'Plumbing work (requires separate plumbing permit and licensed plumber)',
      'Mechanical/HVAC systems',
      'Reroofing',
      'Fences',
      'Demolition',
      'Low-voltage systems (fire alarm, cable, security — when replacing 50%+ of system, breaching walls/floors/ceilings, or installing new system)',
    ] : [
      'New commercial construction',
      'Tenant improvements and interior alterations',
      'Additions and structural modifications',
      'Electrical work (requires separate electrical permit)',
      'Plumbing work (requires separate plumbing permit)',
      'Mechanical/HVAC systems',
      'Fire alarm and suppression systems',
      'Low-voltage electrical installations (permit required before work commences)',
      'Signage',
      'Demolition',
      'Extensive rehabilitation in Historic District (requires Bureau of Planning approval)',
      'New construction or extensive rehabilitation in 100-year flood plain (requires Bureau of Planning approval)',
    ],
    noPermitNeeded: isResidential ? [
      'Replacing lighting fixtures (wall- or ceiling-mounted), duplex receptacles, or switches in an existing electrical system (no license or permit required)',
      'Replacing circuit breakers or fuses',
      'Replacing existing waste line traps, faucets, or plumbing fixtures (sinks, lavatories, toilets, shower stalls, bathtubs) — owner-occupied single-family dwellings only',
      'Emergency water supply line repairs (only enough work to stop a leak; permit must be filed within 3 business days)',
      'Routine maintenance and minor repairs that do not alter structure or systems',
    ] : [
      'Minor finish work (painting, flooring, non-structural cosmetic improvements)',
      'Routine maintenance and minor repairs that do not alter structure, electrical, plumbing, or mechanical systems',
      'Emergency repairs (permit must be filed within 3 business days)',
    ],
    noPermitNote: isResidential
      ? 'Note: Projects in a municipal Historic District involving exterior improvements may require additional review by the Bureau of Planning (717-255-6419). Permits expire after 6 months if work is not continuous.'
      : 'Note: Commercial projects in a Historic District require Bureau of Planning approval. Projects in the 100-year flood plain require additional review. Permits expire after 6 months if work is not continuous. Fast-tracking (progressive permits for each phase) is available for multi-phase jobs.',
    fees: isResidential ? [
      { type: 'Building permit application fee', amount: '$75' },
      { type: 'Building permit — plan review (due at application)', amount: '$4 per $1,000 of estimated cost (nonrefundable)' },
      { type: 'Building permit — inspection (due at permit issuance)', amount: '$4 per $1,000 of estimated cost' },
      { type: 'Electrical permit application fee', amount: '$75' },
      { type: 'Electrical permit — per $1,000 of estimated cost', amount: '$3' },
      { type: 'Plumbing permit application fee', amount: '$75' },
      { type: 'Plumbing permit — per $1,000 of estimated cost', amount: '$8' },
      { type: 'Zoning permit fee', amount: '$3' },
      { type: 'PA State UCC surcharge (all permits)', amount: '$4.50' },
      { type: 'Work started without permit (administrative penalty)', amount: 'Double the normal permit fee' },
      { type: 'Demolition permit', amount: '$40 for first $1,000 + $30 per additional $1,000' },
    ] : [
      { type: 'Building permit application fee', amount: '$100' },
      { type: 'Building permit — plan review (due at application)', amount: '$5 per $1,000 of estimated cost (nonrefundable)' },
      { type: 'Building permit — inspection (due at permit issuance)', amount: '$5 per $1,000 of estimated cost' },
      { type: 'Electrical permit application fee', amount: '$100' },
      { type: 'Electrical permit — per $1,000 of estimated cost', amount: '$3' },
      { type: 'Plumbing permit application fee', amount: '$100' },
      { type: 'Plumbing permit — per $1,000 of estimated cost', amount: '$10' },
      { type: 'Zoning permit fee', amount: '$3' },
      { type: 'PA State UCC surcharge (all permits)', amount: '$4.50' },
      { type: 'Work started without permit (administrative penalty)', amount: 'Double the normal permit fee' },
      { type: 'Building relocation permit', amount: '$100 + $5 per $1,000 of estimated cost for new foundation and related work' },
      { type: 'Demolition permit', amount: '$40 for first $1,000 + $30 per additional $1,000' },
    ],
    requiredDocuments: isResidential ? [
      'Completed Building/Fire/Zoning Permit Application',
      'Construction plans/drawings showing proposed work',
      'Site plan showing property lines and proposed construction',
      'Project cost estimate (estimated cost of materials and labor)',
      'Contractor information (licensed contractors required for electrical and plumbing work)',
      'Proof of property liability insurance (for residential property owners doing their own electrical work)',
      'Stormwater management plan (if required by City Engineer for new development)',
      'Historic Review Board approval (if in a Historic District — contact Bureau of Planning at 717-255-6419)',
    ] : [
      'Completed Building/Fire/Zoning Permit Application',
      'Commercial Construction Documents Submittal form',
      'Construction plans and specifications',
      'Engineered plans stamped by a licensed design professional (expedites review from 30 to 5 business days)',
      'Site plan showing property boundaries and proposed construction',
      'Project cost estimate',
      'Licensed contractor information and credentials',
      'Proof of insurance',
      'Stormwater management plan approval from City Engineer (for new development)',
      'Historic District approval from Bureau of Planning (if applicable)',
      'Flood plain development approval from Bureau of Planning (if in 100-year flood plain)',
      'Separate electrical permit application (for electrical work)',
      'Separate plumbing permit application (for plumbing work)',
    ],
    howToApply: isResidential ? [
      'Prepare your documents: Download the Building/Fire/Zoning Permit Application from the Bureau of Codes forms page. Gather plans, cost estimates, and contractor information.',
      'Submit your application in person at the Martin Luther King Government Center, 10 N 2nd Street, Suite 205, Harrisburg, PA 17101, or by mail with all pertinent information and permit fees.',
      'Pay fees at submission: The application fee ($75) plus plan review fees ($4 per $1,000 of estimated cost) are due at application. Plan review fees are nonrefundable.',
      'Plan review: Residential applications are reviewed within 15 business days, or 5 business days if stamped by a licensed design professional. Additional time is needed if Historic Review Board approval is required.',
      'Pay inspection fees at permit issuance: $4 per $1,000 of estimated cost is due when the permit is issued.',
      'Begin construction: Post your permit at the job site. Schedule required inspections. Permits expire after 6 months if work is not continuous. Fast-tracking (progressive permits per phase) is available for multi-phase jobs.',
    ] : [
      'Pre-application: For projects in a Historic District or flood plain, contact the Bureau of Planning (717-255-6419) before applying. For street excavation or curb cuts, contact City Engineering (717-255-3091).',
      'Prepare your documents: Download the Building/Fire/Zoning Permit Application and Commercial Construction Documents Submittal form. Having plans stamped by a licensed design professional expedites review from 30 to 5 business days.',
      'Submit your application in person at the Martin Luther King Government Center, 10 N 2nd Street, Suite 205, or by mail with all pertinent information and permit fees.',
      'Pay fees at submission: Application fee ($100) plus plan review fees ($5 per $1,000 of estimated cost, nonrefundable) are due at application.',
      'Plan review: Commercial applications are reviewed within 30 business days, or 5 business days if stamped by a licensed design professional. Additional time if Zoning or Historic Board review is required.',
      'Pay inspection fees at permit issuance: $5 per $1,000 of estimated cost is due when the permit is issued.',
      'File separate permits for electrical, plumbing, and low-voltage work as applicable.',
      'Begin construction: Post your permit at the job site. Schedule inspections for each phase. Fast-tracking (progressive permits) is available for multi-phase jobs. Permits expire after 6 months if work is not continuous.',
    ],
    resources: [
      { name: 'Bureau of Codes — Permits & FAQ', url: 'https://harrisburgpa.gov/services/codes/index.php' },
      { name: 'Building/Fire/Zoning Permit Application', url: 'https://harrisburgpa.gov/download/building-fire-zoning-permit/' },
      { name: 'Permit Forms & Documents', url: 'https://harrisburgpa.gov/services/codes/documents_forms.php' },
      { name: 'City Building Code (eCode360)', url: 'https://ecode360.com/13780116' },
      { name: 'City Electrical Code (eCode360)', url: 'https://ecode360.com/13780136' },
    ],
    additionalInfo: isResidential
      ? 'All permits are subject to a $4.50 PA State UCC surcharge. Harrisburg follows the 2021 IRC, 2020 NEC (NFPA-2020), and other PA UCC adopted codes effective January 1, 2026. Electrical work requires a licensed electrician and separate electrical permit. Plumbing work requires a licensed plumber and separate plumbing permit (residential property owners may do limited plumbing work with a residential property owner plumber\'s license, but cannot work on gas lines). If work begins without a permit, the applicant must pay double the normal permit fee. For water/sewer questions, contact Capital Region Water at 888-510-0606.'
      : 'All permits are subject to a $4.50 PA State UCC surcharge. Harrisburg follows the 2021 IBC, 2020 NEC (NFPA-2020), and other PA UCC adopted codes effective January 1, 2026. Electrical work requires a licensed electrician and separate electrical permit. Plumbing work requires a licensed master plumber and separate plumbing permit. Electrical drawings may be required for all commercial/industrial usage as deemed necessary by the Bureau. If work begins without a permit, the applicant must pay double the normal permit fee. New developers mandated by law to submit a stormwater management plan must obtain City Engineer approval before receiving a building permit. For water/sewer questions, contact Capital Region Water at 888-510-0606.',
    lastUpdated: new Date().toISOString(),
  };
}


// =============================================================================
// GENERAL FALLBACK — for cities without specific data
// =============================================================================
function getGeneralPermitInfo(city, state, projectCategory) {
  const isResidential = projectCategory === 'Residential';

  return {
    isGeneric: true,
    permitOffice: {
      name: `${city} Building Department`,
      phone: 'Contact your local building department',
      website: `https://www.google.com/search?q=${encodeURIComponent(city + ' ' + state + ' building permits')}`,
      address: `${city}, ${state}`,
    },
    requiresPermit: isResidential ? [
      'New construction',
      'Additions and structural modifications',
      'Electrical, plumbing, and HVAC work',
      'Decks and porches',
      'Fences (depending on height)',
      'Demolition',
      'Reroofing',
    ] : [
      'New commercial construction',
      'Tenant improvements',
      'Structural modifications',
      'Electrical, plumbing, and HVAC systems',
      'Fire suppression and alarm systems',
      'Signage',
      'Demolition',
    ],
    noPermitNeeded: [
      'Minor repairs and cosmetic work',
      'Painting and flooring',
      'Cabinet and countertop installation',
      'Small storage sheds (typically under 120 sq ft)',
    ],
    noPermitNote: 'Requirements vary by jurisdiction. Contact your local building department to confirm.',
    fees: [
      { type: 'Permit fees', amount: 'Based on project valuation' },
      { type: 'Plan review fees', amount: 'Varies by jurisdiction' },
      { type: 'Inspection fees', amount: 'May be included or separate' },
    ],
    requiredDocuments: isResidential ? [
      'Completed permit application form',
      'Site plan showing property boundaries and setbacks',
      'Detailed construction plans and specifications',
      'Proof of property ownership or authorization letter',
      'Contractor license and insurance information',
      'Project cost estimate',
    ] : [
      'Completed permit application form',
      'Engineered plans stamped by licensed professional',
      'Site plan showing property boundaries and setbacks',
      'Detailed construction plans and specifications',
      'Proof of property ownership or authorization letter',
      'Licensed contractor information and credentials',
      'Project cost estimate',
      'Insurance certificates',
    ],
    howToApply: [
      'Contact your local building department to confirm requirements',
      'Prepare required documents and plans',
      'Submit application and pay applicable fees',
      'Wait for plan review and approval',
      'Schedule required inspections during construction',
      'Obtain certificate of occupancy (if applicable)',
    ],
    additionalInfo: `This is general permit information for ${projectCategory.toLowerCase()} projects. Requirements vary by jurisdiction. Always verify with your local building department for specific requirements, fees, and procedures for ${city}, ${state}.`,
    lastUpdated: new Date().toISOString(),
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`   POST /api/save-email`);
  console.log(`   POST /api/permit-requirements`);
  console.log(`   GET  /api/health`);
});