module.exports = {
    apps: [
        {
            name: 'opengravity-bot',
            script: 'dist/index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PATH: `${process.env.HOME || '/home/opengravity'}/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`,
                GOG_ACCOUNT: 'analistasistemas@gmail.com',
                GOG_KEYRING_BACKEND: 'file',
                GOG_KEYRING_PASSWORD: process.env.GOG_KEYRING_PASSWORD,
            }
        }
    ]
};
