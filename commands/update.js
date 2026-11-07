const gupdate = require('./gupdate');

module.exports = {
    data: {
        name: 'update',
        description: 'โหลดคำสั่งใหม่และอัปเดต Slash Commands ทั้งหมด (Alias ของ /gupdate)'
    },
    run: gupdate.run
};
