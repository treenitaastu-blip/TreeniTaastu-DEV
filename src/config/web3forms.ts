// Web3Forms configuration
// To get your access key, visit: https://web3forms.com/

export const WEB3FORMS_CONFIG = {
  // SECURITY: Only use environment variables - no hardcoded credentials
  ACCESS_KEY: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
  ENDPOINT: 'https://api.web3forms.com/submit',
  TO_EMAIL: 'treenitaastu@gmail.com',
  TO_NAME: 'TreeniTaastu'
};

// Instructions for setup:
// 1. Go to https://web3forms.com/
// 2. Create an account and get your access key
// 3. Add VITE_WEB3FORMS_ACCESS_KEY=your-actual-key to your .env file
// 4. Restart your development server
