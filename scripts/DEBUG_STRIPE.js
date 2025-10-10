// Run this in browser console to see the exact Stripe error

const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: { priceId: 'price_1SBCY0EOy7gy4lEEyRwBvuyw' }
});

console.log('=== STRIPE CHECKOUT DEBUG ===');
console.log('Data:', data);
console.log('Error:', error);
console.log('Error details:', error?.context);
console.log('=============================');



