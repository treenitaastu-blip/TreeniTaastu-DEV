import { useState } from 'react';

export default function ServicesPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('access_key', '43bdd7e8-c2c4-4680-b0cf-eb7b49a6275e');
    formData.append('subject', 'Teenuste päring - TreeniTaastu');
    formData.append('timestamp', new Date().toLocaleString('et-EE'));

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSubmitted(true);
        (e.target as HTMLFormElement).reset();
        setSelectedServices([]);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      setError('Päringu saatmine ebaõnnestus. Palun proovi uuesti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            ✅
          </div>
          <h2 style={{ 
            color: '#1f2937', 
            marginBottom: '16px',
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.025em'
          }}>
            Täname!
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '18px',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            Teie päring on saadetud. Võtame teiega ühendust 24 tunni jooksul.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.3)';
            }}
          >
            Saada uus päring
          </button>
        </div>
      </div>
    );
  }

  const services = [
    {
      id: 'online-consultation',
      name: 'Online konsultatsioonid',
      price: '40€',
      description: 'Individuaalne konsultatsioon videokõne kaudu',
      icon: '💻'
    },
    {
      id: 'personal-training-gym',
      name: '1:1 personaaltreening spordisaalis',
      price: '60€',
      description: 'Individuaalne treening spordisaalis',
      icon: '🏋️'
    },
    {
      id: 'training-plan-creation',
      name: 'Personaalse treeningplaani koostamine',
      price: '80€',
      description: 'Individuaalne treeningplaan teie vajaduste järgi',
      icon: '📋'
    }
  ];

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      minHeight: '100vh',
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.6s ease-out',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '32px 24px' : '48px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animation: 'float 6s ease-in-out infinite'
          }} />
          <h1 style={{ 
            fontSize: window.innerWidth <= 768 ? '28px' : '36px', 
            marginBottom: '16px',
            fontWeight: '800',
            letterSpacing: '-0.025em',
            position: 'relative',
            zIndex: 1
          }}>
            Meie teenused
          </h1>
          <p style={{ 
            opacity: 0.95, 
            fontSize: window.innerWidth <= 768 ? '16px' : '18px',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1
          }}>
            Vali teenused, millest soovid rohkem teada saada
          </p>
        </div>
        
        <div style={{ padding: window.innerWidth <= 768 ? '24px' : '40px' }}>
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              color: '#dc2626',
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '32px',
              textAlign: 'center',
              border: '1px solid #fca5a5',
              animation: 'shake 0.5s ease-in-out'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚠️</div>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Services Selection */}
            <div style={{ marginBottom: window.innerWidth <= 768 ? '32px' : '40px' }}>
              <h3 style={{ 
                color: '#1f2937', 
                marginBottom: '24px', 
                fontSize: window.innerWidth <= 768 ? '20px' : '22px',
                fontWeight: '700',
                letterSpacing: '-0.025em'
              }}>
                Vali teenused
              </h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: window.innerWidth <= 768 ? '20px' : '24px',
                      border: selectedServices.includes(service.id) 
                        ? '2px solid #3b82f6' 
                        : '2px solid #e5e7eb',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: selectedServices.includes(service.id)
                        ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                        : 'white',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedServices.includes(service.id)) {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedServices.includes(service.id)) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{
                      width: window.innerWidth <= 768 ? '20px' : '24px',
                      height: window.innerWidth <= 768 ? '20px' : '24px',
                      border: selectedServices.includes(service.id) 
                        ? '2px solid #3b82f6' 
                        : '2px solid #d1d5db',
                      borderRadius: '6px',
                      marginRight: window.innerWidth <= 768 ? '16px' : '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: selectedServices.includes(service.id) 
                        ? '#3b82f6' 
                        : 'white',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}>
                      {selectedServices.includes(service.id) && (
                        <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#1f2937', 
                        marginBottom: '8px',
                        fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                        letterSpacing: '-0.025em'
                      }}>
                        <span style={{ marginRight: '12px', fontSize: window.innerWidth <= 768 ? '20px' : '24px' }}>{service.icon}</span>
                        {service.name}
                      </div>
                      <div style={{ 
                        color: '#3b82f6', 
                        fontWeight: '700', 
                        fontSize: window.innerWidth <= 768 ? '18px' : '20px',
                        marginBottom: '4px'
                      }}>
                        {service.price}
                      </div>
                      <div style={{ 
                        color: '#6b7280', 
                        fontSize: window.innerWidth <= 768 ? '14px' : '15px',
                        lineHeight: '1.5'
                      }}>
                        {service.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Form Fields */}
            <div style={{ display: 'grid', gap: window.innerWidth <= 768 ? '20px' : '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  fontSize: window.innerWidth <= 768 ? '15px' : '16px'
                }}>
                  Nimi *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  style={{ 
                    width: '100%', 
                    padding: window.innerWidth <= 768 ? '14px 16px' : '16px 20px', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '12px', 
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    background: '#fafafa'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  fontSize: window.innerWidth <= 768 ? '15px' : '16px'
                }}>
                  E-post *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  style={{ 
                    width: '100%', 
                    padding: window.innerWidth <= 768 ? '14px 16px' : '16px 20px', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '12px', 
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    background: '#fafafa'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  fontSize: window.innerWidth <= 768 ? '15px' : '16px'
                }}>
                  Telefon
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  style={{ 
                    width: '100%', 
                    padding: window.innerWidth <= 768 ? '14px 16px' : '16px 20px', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '12px', 
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    background: '#fafafa'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#374151', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  fontSize: window.innerWidth <= 768 ? '15px' : '16px'
                }}>
                  Sõnum
                </label>
                <textarea 
                  name="message" 
                  placeholder="Kirjeldage oma vajadusi või küsimusi..." 
                  style={{ 
                    width: '100%', 
                    padding: window.innerWidth <= 768 ? '14px 16px' : '16px 20px', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '12px', 
                    fontSize: '16px', 
                    minHeight: window.innerWidth <= 768 ? '100px' : '120px', 
                    resize: 'vertical',
                    transition: 'all 0.2s ease',
                    background: '#fafafa',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: isSubmitting 
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                padding: window.innerWidth <= 768 ? '18px' : '20px',
                borderRadius: '16px',
                fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                fontWeight: '700',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSubmitting 
                  ? '0 4px 14px 0 rgba(156, 163, 175, 0.3)'
                  : '0 8px 25px 0 rgba(59, 130, 246, 0.3)',
                marginTop: window.innerWidth <= 768 ? '24px' : '32px',
                letterSpacing: '-0.025em'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px 0 rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Saadan...
                </div>
              ) : (
                'Saada päring'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}