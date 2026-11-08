const { EmbedBuilder } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const featureManager = require('../src/helpers/featureManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
 data: {
 name: 'gfilter',
 description: 'Apply audio Equalizer and tone filters (Supporter)',
 options: [
 {
 name: 'mode',
 type: 3, // STRING
 description: 'Select audio equalizer preset',
 required: true,
 choices: [
 { name: 'Off (Original Sound)', value: 'off' },
 { name: 'Bass Boost (Deep Bass)', value: 'bassboost' },
 { name: 'Nightcore (Fast & Pitch)', value: 'nightcore' },
 { name: 'Pop Vocal (Clear Voices)', value: 'pop' },
 { name: 'Soft Relax (Warm Acoustic)', value: 'soft' },
 { name: 'Vaporwave (Slowed & Reverb)', value: 'vaporwave' }
 ]
 }
 ]
 },
 run: async (client, interaction, kazagumo) => {
 const guildId = interaction.guild.id;
 const access = featureManager.checkAccess('filter', guildId);
 const embed = new EmbedBuilder();

 if (!access.allowed) {
 subscriptionManager.setGuildAudioFilter(guildId, 'off');
 const player = kazagumo.players.get(guildId);
 if (player) {
 player.audioFilter = 'off';
 if (player.playing && player.position !== undefined) {
 try { player.seek(player.position); } catch {}
 }
 }
 const isSupporterOnly = access.mode === 'supporter_only';
 embed.setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
 .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
 .setDescription(access.reason);
 return interaction.reply({ embeds: [embed], flags: 64 });
 }

 const mode = interaction.options.getString('mode') || 'off';
 subscriptionManager.setGuildAudioFilter(guildId, mode);

 const player = kazagumo.players.get(guildId);
 if (player) {
 player.audioFilter = mode;
 // If playing, re-seek at current position to apply filter in real-time
 if (player.playing && player.position !== undefined) {
 try {
 player.seek(player.position);
 } catch {}
 }
 }

 const modeNames = {
 off: 'Off (Original)',
 bassboost: 'Bass Boost ',
 nightcore: 'Nightcore ',
 pop: 'Pop Vocal ',
 soft: 'Soft Relax ',
 vaporwave: 'Vaporwave '
 };

 embed.setColor('#00FF88')
 .setTitle(' Equalizer Configured')
 .setDescription(i18n.t(guildId, 'FILTER_CHANGED', { filter: modeNames[mode] || mode }));

 return interaction.reply({ embeds: [embed] });
 }
};
