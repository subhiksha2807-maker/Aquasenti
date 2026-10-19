// Production values intentionally remain unset until the installed sensors are
// calibrated and the responsible local authority approves maintenance policy.
export const sensorThresholds = {
  turbidity: { warning: null, critical: null },
  tds: { warning: null, critical: null },
  waterLevel: { warningBelow: null, criticalBelow: null },
}

// DEMO MAINTENANCE THRESHOLDS — replace after sensor calibration.
// These are UI maintenance-priority examples, not drinking-water safety limits.
export const demoSensorThresholds = {
  turbidity: { warning: 35, critical: 55 },
  tds: { warning: 320, critical: 450 },
  waterLevel: { warningBelow: 30, criticalBelow: 15 },
}

export const getSensorStatus = (type, value, useDemo = true) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable'
  const limits = useDemo ? demoSensorThresholds[type] : sensorThresholds[type]
  if (!limits) return 'Normal'
  if (type === 'waterLevel') {
    if (limits.criticalBelow !== null && value <= limits.criticalBelow) return 'High'
    if (limits.warningBelow !== null && value <= limits.warningBelow) return 'Warning'
  } else {
    if (limits.critical !== null && value >= limits.critical) return 'High'
    if (limits.warning !== null && value >= limits.warning) return 'Warning'
  }
  return 'Normal'
}
