// Demo project categories. Validate with the operating authority before deployment.
export const maintenanceCategories = [
  { maxDays: 2, label: 'Urgent Inspection', tone: 'danger' },
  { maxDays: 7, label: 'Cleaning Soon', tone: 'warning' },
  { maxDays: 14, label: 'Monitor Closely', tone: 'info' },
  { maxDays: Infinity, label: 'Routine Monitoring', tone: 'success' },
]
