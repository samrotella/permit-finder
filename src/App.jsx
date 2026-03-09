import React, { useState, useEffect } from 'react';
import './App.css';

// Use environment variable for API URL in production, empty string for development (relative URLs)
const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [formData, setFormData] = useState({
    email: '',
    city: '',
    state: '',
    projectCategory: '',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    contact: true,
    resources: true,  // Now expanded by default
    requiresPermit: false,
    noPermit: false,
    fees: false,
    requirements: true,
    howToApply: false,
  });
  const [copiedField, setCopiedField] = useState(null);

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

  // Update URL when results are shown
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
      // Save email if provided (optional)
      if (formData.email) {
        await saveEmail(formData.email, formData.city, formData.state, formData.projectCategory);
      }

      // Fetch permit requirements
      const permitData = await fetchPermitRequirements(
        formData.city,
        formData.state,
        formData.projectCategory
      );

      setResults(permitData);
    } catch (err) {
      setError(err.message || 'Failed to fetch permit requirements');
    } finally {
      setLoading(false);
    }
  };

  const saveEmail = async (email, city, state, projectCategory) => {
    try {
      const response = await fetch(`${API_URL}/api/save-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          city,
          state,
          projectCategory,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to save email');
      }
    } catch (err) {
      console.error('Error saving email:', err);
      // Don't block the user if email save fails
    }
  };

  const fetchPermitRequirements = async (city, state, projectCategory) => {
    try {
      const response = await fetch(`${API_URL}/api/permit-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city,
          state,
          projectCategory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permit requirements');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error('Unable to retrieve permit information. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      city: '',
      state: '',
      projectCategory: '',
    });
    setResults(null);
    setError(null);
    setExpandedSections({
      contact: true,
      resources: true,
      requiresPermit: false,
      noPermit: false,
      fees: false,
      requirements: true,
      howToApply: false,
    });
    window.history.pushState({}, '', '/');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      try {
        await navigator.share({ title: text, url });
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      copyToClipboard(url, 'share');
    }
  };

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
                <div className="form-group optional">
                  <label htmlFor="email">
                    Email Address
                    <span className="optional-badge">Optional</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="form-input"
                  />
                  <span className="helper-text">We'll send you a copy of the requirements</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">
                      City <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Lancaster"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="state">
                      State <span className="required">*</span>
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-input"
                      required
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
                    id="projectCategory"
                    name="projectCategory"
                    value={formData.projectCategory}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select category</option>
                    {projectCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      {loadingMessage}
                    </>
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
              <div className="results-header">
                <div>
                  <h2>Building Permit Guide</h2>
                  <p className="location-info">
                    {formData.city}, {formData.state} • {formData.projectCategory}
                  </p>
                  {results.applicationUrl && (
                    <a 
                      href={results.applicationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="application-link"
                    >
                      View Permit Application →
                    </a>
                  )}
                </div>
                <div className="header-actions">
                  <button onClick={shareResults} className="share-button" title="Share these results">
                    {copiedField === 'share' ? 'Copied!' : 'Share'}
                  </button>
                  <button onClick={resetForm} className="new-search-button">
                    New Search
                  </button>
                </div>
              </div>

              <div className="results-content">
                {/* Check if this is unsupported city (generic fallback) */}
                {results.isGeneric && (
                  <div className="unsupported-notice">
                    <h3>Limited Information Available</h3>
                    <p>We don't have detailed permit data for {formData.city}, {formData.state} yet. Below is general permit information that may apply.</p>
                    <div className="unsupported-actions">
                      <p><strong>We recommend:</strong></p>
                      <ul>
                        <li>Contact {formData.city} Building Department directly</li>
                        <li>Visit their website for specific requirements</li>
                        <li><button className="link-button" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(formData.city + ' ' + formData.state + ' building permits')}`, '_blank')}>Search for {formData.city} building permits →</button></li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 1. PERMIT OFFICE CONTACT */}
                {results.permitOffice && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('contact')}
                    >
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
                                  title="Copy phone number"
                                >
                                  {copiedField === 'phone' ? 'Copied' : 'Copy'}
                                </button>
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
                                  title="Copy email"
                                >
                                  {copiedField === 'email' ? 'Copied' : 'Copy'}
                                </button>
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
                                  Visit Website →
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
                                  title="Copy address"
                                >
                                  {copiedField === 'address' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* 2. PERMITTING RESOURCES - MOVED UP AND EXPANDED BY DEFAULT */}
                {results.resources && results.resources.length > 0 && (
                  <section className="info-section collapsible resources-section">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('resources')}
                    >
                      <h3>Permitting Resources</h3>
                      <span className="collapse-icon">{expandedSections.resources ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.resources && (
                      <div className="section-content">
                        <div className="resources-grid">
                          {results.resources.map((resource, index) => (
                            <a 
                              key={index} 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="resource-card"
                            >
                              <span className="resource-name">{resource.name}</span>
                              <span className="resource-arrow">→</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* 3. WHAT REQUIRES A PERMIT */}
                {results.requiresPermit && results.requiresPermit.length > 0 && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('requiresPermit')}
                    >
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

                {/* 4. WHAT DOESN'T REQUIRE A PERMIT */}
                {results.noPermitNeeded && results.noPermitNeeded.length > 0 && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('noPermit')}
                    >
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

                {/* 5. BUILDING PERMIT COSTS */}
                {results.fees && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('fees')}
                    >
                      <h3>Building Permit Costs</h3>
                      <span className="collapse-icon">{expandedSections.fees ? '▼' : '▶'}</span>
                    </div>
                    {expandedSections.fees && (
                      <div className="section-content">
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

                {/* 6. BUILDING PERMIT REQUIREMENTS */}
                {results.requiredDocuments && results.requiredDocuments.length > 0 && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('requirements')}
                    >
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

                {/* 7. HOW TO APPLY */}
                {results.howToApply && results.howToApply.length > 0 && (
                  <section className="info-section collapsible">
                    <div 
                      className="section-header"
                      onClick={() => toggleSection('howToApply')}
                    >
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

                {/* ADDITIONAL INFO */}
                {results.additionalInfo && (
                  <section className="info-section">
                    <div className="additional-info-box">
                      <p className="additional-info">{results.additionalInfo}</p>
                    </div>
                  </section>
                )}

                {results.lastUpdated && (
                  <div className="results-footer">
                    <small>Information last updated: {new Date(results.lastUpdated).toLocaleDateString()}</small>
                  </div>
                )}
              </div>
            </div>

            {/* Floating New Search Button for Mobile */}
            <button className="floating-new-search" onClick={resetForm} title="New Search">
              Search
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© 2026 Permit Lift • Always verify requirements with your local building department</p>
      </footer>
    </div>
  );
}

export default App;