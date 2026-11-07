const gupdate = require('./gupdate');

module.exports = {
    data: {
        name: 'update',
        description: 'Reload command modules and sync Slash Commands to Discord (Alias)'
    },
    run: gupdate.run
};
