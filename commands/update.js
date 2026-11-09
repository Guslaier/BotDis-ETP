const { SlashCommandBuilder } = require('discord.js');
const gupdate = require('./gupdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Reload command modules and sync Slash Commands to Discord (Owner Only Alias)')
        .setDefaultMemberPermissions(0),
    run: gupdate.run
};
