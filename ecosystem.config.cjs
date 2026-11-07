module.exports = {
  apps: [
    {
      name: 'goolix-bot',
      script: 'index.js',
      node_args: '--expose-gc --max-old-space-size=80',
      max_memory_restart: '120M',
      autorestart: true,
      watch: false
    },
    {
      name: 'goolix-node',
      script: 'src/cluster/AudioNodeServer.js',
      node_args: '--expose-gc --max-old-space-size=80',
      max_memory_restart: '120M',
      autorestart: true,
      watch: false
    }
  ]
};

