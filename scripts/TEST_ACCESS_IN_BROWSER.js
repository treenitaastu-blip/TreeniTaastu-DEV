// Copy and paste this into your browser console while logged in
// This will show you exactly what useAccess is returning

// 1. Check raw entitlements
const { data: ents } = await supabase
  .from('user_entitlements')
  .select('*')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id)
  .in('status', ['active', 'trialing']);

console.log('Raw entitlements from DB:', ents);

// 2. Test the access logic manually
const now = new Date();
const hasActiveStatic = ents?.some(e => 
  e.product === "static" && 
  !e.paused && 
  (
    (e.status === "active" && (e.expires_at === null || new Date(e.expires_at) > now)) ||
    (e.status === "trialing" && e.trial_ends_at && new Date(e.trial_ends_at) > now)
  )
) ?? false;

console.log('Should have static access:', hasActiveStatic);
console.log('Trial ends at:', ents?.[0]?.trial_ends_at);
console.log('Is trial end in future?:', new Date(ents?.[0]?.trial_ends_at) > now);

// 3. Test Stripe checkout
const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
  body: { priceId: 'price_1SBCY0EOy7gy4lEEyRwBvuyw' }
});

console.log('Stripe checkout URL:', checkoutData?.url);
console.log('Stripe checkout error:', checkoutError);



