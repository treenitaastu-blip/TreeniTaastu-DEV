import { useState } from 'react';

export default function ServicesPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        height: '100vh',
        fontSize: '18px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h2 style={{ color: '#059669', marginBottom: '20px' }}>✅ Täname!</h2>
          <p>Teie päring on saadetud. Võtame teiega ühendust 24 tunni jooksul.</p>
          <button 
            onClick={() => setIsSubmitted(false)}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Saada uus päring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Meie teenused</h1>
          <p style={{ opacity: 0.9, fontSize: '16px' }}>Vali teenused, millest soovid rohkem teada saada</p>
        </div>
        
        <div style={{ padding: '30px' }}>
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              ❌ {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#374151', marginBottom: '15px', fontSize: '18px' }}>Vali teenused</h3>
              
              <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="services[]" value="Online konsultatsioonid" style={{ marginRight: '12px', width: '18px', height: '18px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Online konsultatsioonid</div>
                  <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '16px' }}>40€</div>
                  <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Individuaalne konsultatsioon videokõne kaudu</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="services[]" value="1:1 personaaltreening spordisaalis" style={{ marginRight: '12px', width: '18px', height: '18px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>1:1 personaaltreening spordisaalis</div>
                  <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '16px' }}>60€</div>
                  <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Individuaalne treening spordisaalis</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="services[]" value="Personaalse treeningplaani koostamine" style={{ marginRight: '12px', width: '18px', height: '18px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Personaalse treeningplaani koostamine</div>
                  <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '16px' }}>80€</div>
                  <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Individuaalne treeningplaan teie vajaduste järgi</div>
                </div>
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#374151', fontWeight: 500, marginBottom: '8px' }}>Nimi *</label>
              <input type="text" name="name" required style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }} />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#374151', fontWeight: 500, marginBottom: '8px' }}>E-post *</label>
              <input type="email" name="email" required style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }} />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#374151', fontWeight: 500, marginBottom: '8px' }}>Telefon</label>
              <input type="tel" name="phone" style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }} />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#374151', fontWeight: 500, marginBottom: '8px' }}>Sõnum</label>
              <textarea name="message" placeholder="Kirjeldage oma vajadusi või küsimusi..." style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }}></textarea>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Saadan...' : 'Saada päring'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}