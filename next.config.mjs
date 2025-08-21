/** @type {import('next').NextConfig} */
const nextConfig = {
	// Disable production browser source maps to reduce memory usage
	productionBrowserSourceMaps: false,

	// Ensure server components load ws from Node and don't bundle optional natives
	experimental: {
		serverComponentsExternalPackages: ['ws'],
	},

	// Tweak webpack to disable filesystem cache which can OOM on some systems
	webpack: (config, { dev, isServer }) => {
		// Disable persistent cache to avoid PackFileCacheStrategy OOMs
		config.cache = false

		// Reduce source map overhead
		if (!dev) {
			config.devtool = false
		}

		// Prevent webpack from bundling optional native deps of ws
		if (isServer) {
			config.externals = Array.isArray(config.externals)
				? [...config.externals, 'bufferutil', 'utf-8-validate']
				: ['bufferutil', 'utf-8-validate']
		} else {
			config.resolve = config.resolve || {}
			config.resolve.fallback = { ...(config.resolve.fallback || {}), ws: false }
		}
		return config
	},
}

export default nextConfig;
