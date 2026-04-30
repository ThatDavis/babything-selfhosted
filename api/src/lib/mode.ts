export const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE ?? 'selfhosted'
export const isCloud = () => DEPLOYMENT_MODE === 'cloud'
export const isSelfHosted = () => DEPLOYMENT_MODE !== 'cloud'
