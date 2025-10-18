// Web3Forms configuration
// To get your access key, visit: https://web3forms.com/

export const WEB3FORMS_CONFIG = {
  // Web3Forms access key
  ACCESS_KEY: process.env.REACT_APP_WEB3FORMS_ACCESS_KEY || '43bdd7e8-c2c4-4680-b0cf-eb7b49a6275e',
  ENDPOINT: 'https://api.web3forms.com/submit',
  TO_EMAIL: 'treenitaastu@gmail.com',
  TO_NAME: 'TreeniTaastu'
};

// Instructions for setup:
// 1. Go to https://web3forms.com/
// 2. Create an account and get your access key
// 3. Add REACT_APP_WEB3FORMS_ACCESS_KEY=your-actual-key to your .env file
// 4. Restart your development server
