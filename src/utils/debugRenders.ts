// Debug utility to track component re-renders
export const debugRenders = (componentName: string, props?: any) => {
  console.log(`🔄 ${componentName} rendered at ${new Date().toISOString()}`);
  
  // Track render count
  if (!window.__renderCounts) {
    window.__renderCounts = {};
  }
  
  if (!window.__renderCounts[componentName]) {
    window.__renderCounts[componentName] = 0;
  }
  
  window.__renderCounts[componentName]++;
  
  if (window.__renderCounts[componentName] > 10) {
    console.warn(`⚠️ ${componentName} has rendered ${window.__renderCounts[componentName]} times - possible infinite loop!`);
    console.warn(`🔍 Props:`, props);
  }
};

// Debug utility to track useEffect calls
export const debugUseEffect = (effectName: string, dependencies: any[]) => {
  console.log(`🔧 useEffect ${effectName} called with dependencies:`, dependencies);
  
  // Track useEffect count
  if (!window.__useEffectCounts) {
    window.__useEffectCounts = {};
  }
  
  const key = `${effectName}_${JSON.stringify(dependencies)}`;
  if (!window.__useEffectCounts[key]) {
    window.__useEffectCounts[key] = 0;
  }
  
  window.__useEffectCounts[key]++;
  
  if (window.__useEffectCounts[key] > 5) {
    console.warn(`⚠️ useEffect ${effectName} called ${window.__useEffectCounts[key]} times - possible infinite loop!`);
  }
};

// Debug utility to track state changes
export const debugStateChange = (componentName: string, stateName: string, oldValue: any, newValue: any) => {
  console.log(`📊 ${componentName} state ${stateName} changed:`, { oldValue, newValue });
  
  if (oldValue === newValue) {
    console.warn(`⚠️ ${componentName} state ${stateName} set to same value - unnecessary re-render!`);
  }
};

// Clear debug counters
export const clearDebugCounters = () => {
  window.__renderCounts = {};
  window.__useEffectCounts = {};
  console.log('🧹 Debug counters cleared');
};

// Get render summary
export const getRenderSummary = () => {
  console.log('📈 Render Summary:', window.__renderCounts);
  console.log('🔧 useEffect Summary:', window.__useEffectCounts);
};
