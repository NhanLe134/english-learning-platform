import { v2 as cloudinary } from 'cloudinary'
import { env } from './env.js'

export function getCloudinary() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error('Cloudinary environment variables are required')
  }

  return cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  })
}
