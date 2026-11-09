const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const gupdate = require('./gupdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Reload command modules and sync Slash Commands to Discord (Server Owner / Bot Owner)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    run: gupdate.run
};
