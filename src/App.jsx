import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    projectCategory: '',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    contact: false,
    resources: true,
    requiresPermit: false,
    noPermit: false,
    fees: true,
    requirements: true,
    howToApply: false,
  });
  const [copiedField, setCopiedField] = useState(null);
  const [projectCost, setProjectCost] = useState('');
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  const projectCategories = [
    'Residential',
    'Commercial',
  ];

  const loadingMessages = [
    'Searching for building department...',
    'Retrieving permit requirements...',
    'Gathering fee information...',
    'Almost there...',
  ];

  useEffect(() => {
    if (loading) {
      let messageIndex = 0;
      setLoadingMessage(loadingMessages[0]);
      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    if (results && formData.city && formData.state) {
      const citySlug = formData.city.toLowerCase().replace(/\s+/g, '-');
      const stateSlug = formData.state.toLowerCase();
      const newUrl = `/permits/${citySlug}-${stateSlug}`;
      window.history.pushState({ city: formData.city, state: formData.state }, '', newUrl);
    }
  }, [results, formData.city, formData.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.city || !formData.state || !formData.projectCategory) {
      setError('Please fill in city, state, and project category');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const permitData = await fetchPermitRequirements(
        formData.city, formData.state, formData.projectCategory
      );
      setResults(permitData);
    } catch (err) {
      setError(err.message || 'Failed to fetch permit requirements');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermitRequirements = async (city, state, projectCategory) => {
    const response = await fetch(`${API_URL}/api/permit-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, state, projectCategory }),
    });
    if (!response.ok) throw new Error('Failed to fetch permit requirements');
    return await response.json();
  };

  const handleEmailSubmit = async () => {
    if (!emailAddress) return;
    try {
      await fetch(`${API_URL}/api/save-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          city: formData.city,
          state: formData.state,
          projectCategory: formData.projectCategory,
          timestamp: new Date().toISOString(),
        }),
      });
      setEmailSaved(true);
      setTimeout(() => setShowEmailCapture(false), 2000);
    } catch (err) {
      console.error('Error saving email:', err);
    }
  };

  const resetForm = () => {
    setFormData({ city: '', state: '', projectCategory: '' });
    setResults(null);
    setError(null);
    setProjectCost('');
    setShowEmailCapture(false);
    setEmailSaved(false);
    setEmailAddress('');
    setExpandedSections({
      contact: false, resources: true, requiresPermit: false,
      noPermit: false, fees: true, requirements: true, howToApply: false,
    });
    window.history.pushState({}, '', '/');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareResults = async () => {
    const url = window.location.href;
    const text = `Building Permit Requirements for ${formData.city}, ${formData.state}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); }
      catch (err) { console.log('Share canceled:', err); }
    } else {
      copyToClipboard(url, 'share');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate total permit fees based on project cost input
  const calculateFees = () => {
    if (!projectCost || !results?.fees) return null;
    const cost = parseFloat(projectCost);
    if (isNaN(cost) || cost <= 0) return null;

    let totalEstimate = 0;
    const breakdown = [];

    for (const fee of results.fees) {
      const amt = fee.amount;
      const type = fee.type.toLowerCase();

      // Fixed dollar amounts
      const fixedMatch = amt.match(/^\$(\d+(?:\.\d+)?)\s*$/);
      if (fixedMatch) {
        const val = parseFloat(fixedMatch[1]);
        totalEstimate += val;
        breakdown.push({ label: fee.type, amount: val });
        continue;
      }

      // "Flat $X" pattern
      const flatMatch = amt.match(/flat\s+\$(\d+(?:\.\d+)?)/i);
      if (flatMatch) {
        const val = parseFloat(flatMatch[1]);
        totalEstimate += val;
        breakdown.push({ label: fee.type, amount: val });
        continue;
      }

      // "$X per sq ft" — skip, need sq ft not cost
      if (amt.includes('per sq ft')) continue;

      // "$X per $1,000" or "$X per each $1,000"
      const perThousandMatch = amt.match(/\$(\d+(?:\.\d+)?)\s+per\s+(?:each\s+)?\$1,000/i);
      if (perThousandMatch) {
        const rate = parseFloat(perThousandMatch[1]);
        const val = Math.ceil(cost / 1000) * rate;
        totalEstimate += val;
        breakdown.push({ label: fee.type, amount: val });
        continue;
      }

      // Application fee + per $1,000 combined: "$75 plus $8 per each $1,000"
      // Already handled by the fixed + per-thousand patterns above since
      // the data splits these into separate fee rows. But handle combo if needed.

      // PA State surcharge
      if (type.includes('surcharge') || type.includes('ucc')) {
        const surchargeMatch = amt.match(/\$(\d+(?:\.\d+)?)/);
        if (surchargeMatch) {
          const val = parseFloat(surchargeMatch[1]);
          totalEstimate += val;
          breakdown.push({ label: fee.type, amount: val });
        }
        continue;
      }
    }

    return { total: totalEstimate, breakdown };
  };

  // Extract review timeline from howToApply or additionalInfo
  const getReviewTimeline = () => {
    if (!results) return null;
    const allText = [
      ...(results.howToApply || []),
      results.additionalInfo || '',
    ].join(' ');

    const timelineMatch = allText.match(/(\d+)\s*business\s*days/i);
    const expeditedMatch = allText.match(/(\d+)\s*(?:business\s*)?days?\s*if\s*(?:it\s*is\s*)?stamped/i);

    if (timelineMatch) {
      return {
        standard: timelineMatch[1] + ' business days',
        expedited: expeditedMatch ? expeditedMatch[1] + ' business days (with licensed design professional stamp)' : null,
      };
    }
    return null;
  };

  // Determine which permit types are needed based on the data
  const getPermitChecklist = () => {
    if (!results?.requiresPermit) return null;
    const items = results.requiresPermit;
    const checklist = [];

    checklist.push({ name: 'Building Permit', needed: true });

    const hasElectrical = items.some(i => i.toLowerCase().includes('electrical'));
    if (hasElectrical) {
      const isSeparate = items.some(i => i.toLowerCase().includes('separate electrical'));
      checklist.push({
        name: 'Electrical Permit',
        needed: true,
        note: isSeparate ? 'Separate application required' : null,
      });
    }

    const hasPlumbing = items.some(i => i.toLowerCase().includes('plumbing'));
    if (hasPlumbing) {
      const isSeparate = items.some(i => i.toLowerCase().includes('separate plumbing'));
      checklist.push({
        name: 'Plumbing Permit',
        needed: true,
        note: isSeparate ? 'Separate application required' : null,
      });
    }

    const hasMechanical = items.some(i =>
      i.toLowerCase().includes('hvac') || i.toLowerCase().includes('mechanical')
    );
    if (hasMechanical) {
      checklist.push({ name: 'Mechanical/HVAC Permit', needed: true });
    }

    const hasFire = items.some(i =>
      i.toLowerCase().includes('fire') && !i.toLowerCase().includes('fire/safety')
    );
    if (hasFire) {
      checklist.push({ name: 'Fire Systems Permit', needed: true });
    }

    const hasDemo = items.some(i => i.toLowerCase().includes('demolition'));
    if (hasDemo) {
      checklist.push({ name: 'Demolition Permit', needed: true, note: 'If applicable' });
    }

    return checklist;
  };

  const feeEstimate = calculateFees();
  const reviewTimeline = results ? getReviewTimeline() : null;
  const permitChecklist = results ? getPermitChecklist() : null;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">Permit Lift</h1>
          <p className="tagline">Navigate construction permits with confidence</p>
        </div>
      </header>

      <main className="main-content">
        {!results ? (
          <div className="form-container">
            <div className="form-card">
              <div className="form-header">
                <h2>Find Your Permit Requirements</h2>
                <p>Enter your project location to get comprehensive permit information</p>
              </div>

              <form onSubmit={handleSubmit} className="permit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City <span className="required">*</span></label>
                    <input
                      type="text" id="city" name="city"
                      value={formData.city} onChange={handleInputChange}
                      placeholder="Lancaster" className="form-input" required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State <span className="required">*</span></label>
                    <select
                      id="state" name="state"
                      value={formData.state} onChange={handleInputChange}
                      className="form-input" required
                    >
                      <option value="">Select state</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="projectCategory">
                    Project Category <span className="required">*</span>
                  </label>
                  <select
                    id="projectCategory" name="projectCategory"
                    value={formData.projectCategory} onChange={handleInputChange}
                    className="form-input" required
                  >
                    <option value="">Select category</option>
                    {projectCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? (
                    <><span className="spinner"></span>{loadingMessage}</>
                  ) : (
                    'Find Permit Requirements'
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="results-container">
            <div className="results-card">
              {/* RESULTS HEADER */}
              <div className="results-header">
                <div>
                  <h2>Building Permit Guide</h2>
                  <p className="location-info">
                    {formData.city}, {formData.state} — {formData.projectCategory}
                  </p>
                </div>
                <div className="header-actions">
                  <button onClick={handlePrint} className="share-button" title="Print this page">
                    Print
                  </button>
                  <button onClick={shareResults} className="share-button" title="Share these results">
                    {copiedField === 'share' ? 'Copied!' : 'Share'}
                  </button>
                  <button onClick={resetForm} className="new-search-button">
                    New Search
                  </button>
                </div>
              </div>

              <div className="results-content">
                {/* GENERIC FALLBACK NOTICE */}
                {results.isGeneric && (
                  <div className="unsupported-notice">
                    <h3>Limited Information Available</h3>
                    <p>We don't have detailed permit data for {formData.city}, {formData.state} yet. Below is general permit information that may apply.</p>
                    <div className="unsupported-actions">
                      <p><strong>We recommend:</strong></p>
                      <ul>
                        <li>Contact {formData.city} Building Department directly</li>
                        <li>Visit their website for specific requirements</li>
                        <li><button className="link-button" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(formData.city + ' ' + formData.state + ' building permits')}`, '_blank')}>Search for {formData.city} building permits</button></li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* AT-A-GLANCE: TIMELINE + PERMIT CHECKLIST + APPLICATION LINK */}
                {!results.isGeneric && (
                  <section className="at-a-glance">
                    <div className="glance-grid">
                      {/* Review Timeline */}
                      {reviewTimeline && (
                        <div className="glance-card">
                          <span className="glance-label">Review Timeline</span>
                          <span className="glance-value">{reviewTimeline.standard}</span>
                          {reviewTimeline.expedited && (
                            <span className="glance-subtext">{reviewTimeline.expedited}</span>
                          )}
                        </div>
                      )}

                      {/* Permit Checklist */}
                      {permitChecklist && (
                        <div className="glance-card glance-card-wide">
                          <span className="glance-label">Permits You May Need</span>
                          <div className="permit-checklist">
                            {permitChecklist.map((item, index) => (
                              <div key={index} className="checklist-item">
                                <span className="checklist-dot"></span>
                                <span className="checklist-name">{item.name}</span>
                                {item.note && <span className="checklist-note">{item.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Application Link */}
                      {results.applicationUrl && (
                        <div className="glance-card">
                          <span className="glance-label">Get Started</span>
                          <a
                            href={results.applicationUrl}
                            target="_blank" rel="noopener noreferrer"
                            className="glance-action-link"
                          >
                            Download Permit Application
                          </a>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* PERMITTING RESOURCES — PROMINENT DOWNLOAD LINKS */}
                {results.resources && results.resources.length > 0 && (
                  <section className="info-section collapsible resources-section">
                    <div className="section-header" onClick={() => toggleSection('resources')}>
                      <h3>Permitting Resources</h3>
                      <span className="collapse-icon">{expandedSections.resources ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.resources && (
                      <div className="section-content">
                        <div className="resources-grid">
                          {results.resources.map((resource, index) => (
                            <a
                              key={index} href={resource.url}
                              target="_blank" rel="noopener noreferrer"
                              className="resource-card"
                            >
                              <span className="resource-name">{resource.name}</span>
                              <span className="resource-arrow">&rarr;</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* BUILDING PERMIT COSTS + FEE CALCULATOR */}
                {results.fees && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('fees')}>
                      <h3>Building Permit Costs</h3>
                      <span className="collapse-icon">{expandedSections.fees ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.fees && (
                      <div className="section-content">
                        {/* Fee Calculator */}
                        <div className="fee-calculator">
                          <label className="calculator-label" htmlFor="projectCost">
                            Estimate your permit fees
                          </label>
                          <div className="calculator-input-row">
                            <span className="currency-prefix">$</span>
                            <input
                              type="number" id="projectCost"
                              value={projectCost}
                              onChange={(e) => setProjectCost(e.target.value)}
                              placeholder="Enter estimated project cost"
                              className="calculator-input"
                              min="0"
                            />
                          </div>
                          {feeEstimate && (
                            <div className="calculator-result">
                              <div className="estimate-breakdown">
                                {feeEstimate.breakdown.map((item, i) => (
                                  <div key={i} className="estimate-row">
                                    <span className="estimate-label">{item.label}</span>
                                    <span className="estimate-amount">${item.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="estimate-total">
                                <span>Estimated Total</span>
                                <span>${feeEstimate.total.toFixed(2)}</span>
                              </div>
                              <p className="estimate-disclaimer">
                                Estimate only. Actual fees may vary. Does not include fees for separate electrical, plumbing, or specialty permits.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Fee Schedule Table */}
                        <div className="fee-schedule-header">Full Fee Schedule</div>
                        {results.fees.map((fee, index) => (
                          <div key={index} className="fee-row">
                            <span className="fee-type">{fee.type}</span>
                            <span className="fee-amount">{fee.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* BUILDING PERMIT REQUIREMENTS */}
                {results.requiredDocuments && results.requiredDocuments.length > 0 && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('requirements')}>
                      <h3>Building Permit Requirements</h3>
                      <span className="collapse-icon">{expandedSections.requirements ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.requirements && (
                      <div className="section-content">
                        <ul className="requirements-list">
                          {results.requiredDocuments.map((doc, index) => (
                            <li key={index} className="requirement-item">{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* WHAT REQUIRES A PERMIT */}
                {results.requiresPermit && results.requiresPermit.length > 0 && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('requiresPermit')}>
                      <h3>What Requires a Building Permit?</h3>
                      <span className="collapse-icon">{expandedSections.requiresPermit ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.requiresPermit && (
                      <div className="section-content">
                        <ul className="requirements-list">
                          {results.requiresPermit.map((item, index) => (
                            <li key={index} className="requirement-item">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* WHAT DOESN'T REQUIRE A PERMIT */}
                {results.noPermitNeeded && results.noPermitNeeded.length > 0 && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('noPermit')}>
                      <h3>What Doesn't Require a Permit?</h3>
                      <span className="collapse-icon">{expandedSections.noPermit ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.noPermit && (
                      <div className="section-content">
                        <ul className="requirements-list">
                          {results.noPermitNeeded.map((item, index) => (
                            <li key={index} className="requirement-item">{item}</li>
                          ))}
                        </ul>
                        {results.noPermitNote && (
                          <p className="note-text">{results.noPermitNote}</p>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* HOW TO APPLY */}
                {results.howToApply && results.howToApply.length > 0 && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('howToApply')}>
                      <h3>How to Apply for a Building Permit</h3>
                      <span className="collapse-icon">{expandedSections.howToApply ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.howToApply && (
                      <div className="section-content">
                        <ol className="steps-list-simple">
                          {results.howToApply.map((step, index) => (
                            <li key={index} className="step-item-simple">
                              <strong>Step {index + 1}:</strong> {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </section>
                )}

                {/* PERMIT OFFICE CONTACT — collapsed by default */}
                {results.permitOffice && (
                  <section className="info-section collapsible">
                    <div className="section-header" onClick={() => toggleSection('contact')}>
                      <h3>Permit Office Contact</h3>
                      <span className="collapse-icon">{expandedSections.contact ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.contact && (
                      <div className="section-content">
                        <div className="info-grid">
                          {results.permitOffice.name && (
                            <div className="info-item">
                              <span className="info-label">Department</span>
                              <span className="info-value">{results.permitOffice.name}</span>
                            </div>
                          )}
                          {results.permitOffice.phone && (
                            <div className="info-item">
                              <span className="info-label">Phone</span>
                              <div className="info-value-with-copy">
                                <span className="info-value">{results.permitOffice.phone}</span>
                                <button
                                  className="copy-button"
                                  onClick={() => copyToClipboard(results.permitOffice.phone, 'phone')}
                                >{copiedField === 'phone' ? 'Copied' : 'Copy'}</button>
                              </div>
                            </div>
                          )}
                          {results.permitOffice.email && (
                            <div className="info-item">
                              <span className="info-label">Email</span>
                              <div className="info-value-with-copy">
                                <span className="info-value">{results.permitOffice.email}</span>
                                <button
                                  className="copy-button"
                                  onClick={() => copyToClipboard(results.permitOffice.email, 'email')}
                                >{copiedField === 'email' ? 'Copied' : 'Copy'}</button>
                              </div>
                            </div>
                          )}
                          {results.permitOffice.hours && (
                            <div className="info-item">
                              <span className="info-label">Office Hours</span>
                              <span className="info-value">{results.permitOffice.hours}</span>
                            </div>
                          )}
                          {results.permitOffice.website && (
                            <div className="info-item">
                              <span className="info-label">Website</span>
                              <span className="info-value">
                                <a href={results.permitOffice.website} target="_blank" rel="noopener noreferrer">
                                  Visit Website
                                </a>
                              </span>
                            </div>
                          )}
                          {results.permitOffice.address && (
                            <div className="info-item full-width">
                              <span className="info-label">Address</span>
                              <div className="info-value-with-copy">
                                <span className="info-value">{results.permitOffice.address}</span>
                                <button
                                  className="copy-button"
                                  onClick={() => copyToClipboard(results.permitOffice.address, 'address')}
                                >{copiedField === 'address' ? 'Copied' : 'Copy'}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* ADDITIONAL INFO */}
                {results.additionalInfo && (
                  <section className="info-section">
                    <div className="additional-info-box">
                      <p className="additional-info">{results.additionalInfo}</p>
                    </div>
                  </section>
                )}

                {/* EMAIL CAPTURE — post-results */}
                <section className="info-section email-capture-section">
                  {!showEmailCapture ? (
                    <button
                      className="email-prompt-button"
                      onClick={() => setShowEmailCapture(true)}
                    >
                      Email me a copy of these requirements
                    </button>
                  ) : emailSaved ? (
                    <div className="email-success">Sent! Check your inbox.</div>
                  ) : (
                    <div className="email-capture-form">
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="your@email.com"
                        className="email-input"
                      />
                      <button onClick={handleEmailSubmit} className="email-send-button">
                        Send
                      </button>
                    </div>
                  )}
                </section>

                {results.lastUpdated && (
                  <div className="results-footer">
                    <small>Information last updated: {new Date(results.lastUpdated).toLocaleDateString()}</small>
                  </div>
                )}
              </div>
            </div>

            <button className="floating-new-search" onClick={resetForm} title="New Search">
              Search
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2026 Permit Lift &middot; Always verify requirements with your local building department</p>
      </footer>
    </div>
  );
}

export default App;