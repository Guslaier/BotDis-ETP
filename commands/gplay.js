const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
 data: {
 name: 'gplay',
 description: 'Play music from YouTube, Spotify, SoundCloud, or title search',
 options: [
 {
 name: 'query',
 type: 3, // STRING
 description: 'Song title, artist name, or URL (YouTube / Spotify / SoundCloud)',
 required: true,
 },
 {
 name: 'top',
 type: 5, // BOOLEAN
 description: 'Play this track next up in queue (Priority jump)',
 required: false,
 },
 {
 name: 'playlist',
 type: 5, // BOOLEAN
 description: 'Import entire playlist if link contains a mix or playlist',
 required: false,
 },
 ],
 },
 run: async (client, interaction, kazagumo) => {
 const voiceChannel = interaction.member?.voice?.channel;
 const guildId = interaction.guild.id;
 const embed = new EmbedBuilder().setColor('#00FF88');

 if (!voiceChannel) {
 embed.setDescription(i18n.t(guildId, 'VOICE_JOIN_REQUIRED'));
 return interaction.reply({ embeds: [embed], flags: 64 });
 }

 const host = subscriptionManager.getPublicWebUrl();
 const donateUrl = `${host}/donate?guild=${guildId}&guildId=${guildId}&userId=${interaction.user.id}`;
 const donateRow = new ActionRowBuilder().addComponents(
 new ButtonBuilder()
 .setLabel(i18n.t(guildId, 'DONATE_BTN_LABEL'))
 .setStyle(ButtonStyle.Link)
 .setURL(donateUrl)
 );

 // 1. Slot Guard Check
 const slotCheck = subscriptionManager.checkStreamSlot(interaction.guild.id, kazagumo, client);
 if (!slotCheck.allowed) {
 let msg = slotCheck.message;
 if (slotCheck.reason === 'FREE_SLOTS_FULL') {
 msg = i18n.t(guildId, 'SLOTS_FULL', { current: slotCheck.current, max: slotCheck.max });
 } else if (slotCheck.reason === 'CLUSTER_FULL') {
 msg = i18n.t(guildId, 'CLUSTER_FULL');
 }
 embed.setColor('#FFD600')
 .setTitle(i18n.t(guildId, 'SLOTS_FULL_TITLE'))
 .setDescription(msg);
 return interaction.reply({ embeds: [embed], components: [donateRow] });
 }

 const tierConfig = subscriptionManager.getTierConfig(interaction.guild.id);
 const query = interaction.options.getString('query');
 const top = interaction.options.getBoolean('top');
 const forcePlaylist = Boolean(interaction.options.getBoolean('playlist'));
 await interaction.deferReply();

 let player = kazagumo.players.get(interaction.guild.id);
 if (!player) {
 player = await kazagumo.createPlayer({
 guildId: interaction.guild.id,
 textId: interaction.channel.id,
 voiceId: voiceChannel.id,
 volume: settingsManager.getGuildVolume(interaction.guild.id)
 });
 }

 // 2. Queue Limit Check
 if (player.queue.length >= tierConfig.maxQueue) {
 embed.setColor('#EF4444')
 .setTitle(i18n.t(guildId, 'QUEUE_LIMIT_TITLE'))
 .setDescription(i18n.t(guildId, 'QUEUE_LIMIT_FREE'));
 return interaction.followUp({ embeds: [embed], components: [donateRow] });
 }

 // Fast Single-Pass Search with built-in Anti-Ban and Fallback
 const result = await kazagumo.search(query, {
 requester: interaction.user,
 forcePlaylist
 });

 if (!result.tracks.length) {
 embed.setDescription(i18n.t(guildId, 'TRACK_NOT_FOUND'));
 return interaction.followUp({ embeds: [embed] });
 }

 if (result.type === 'PLAYLIST') {
 const addedTracks = [];
 let skippedOver30Min = 0;

 for (const track of result.tracks) {
 if (player.queue.length + addedTracks.length >= tierConfig.maxQueue) break;

 // 30-minute limit check for free tier
 if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
 skippedOver30Min++;
 continue;
 }
 addedTracks.push(track);
 player.queue.add(track);
 }

 let msg = ` **${result.playlistName || 'Playlist'}**\n\n${i18n.t(guildId, 'PLAYLIST_ADDED')} (${addedTracks.length} tracks)`;
 if (skippedOver30Min > 0) {
 msg += `\n${i18n.t(guildId, 'PLAYLIST_SKIPPED_30MIN', { count: skippedOver30Min })}`;
 }
 embed.setDescription(msg);
 await interaction.followUp({ embeds: [embed] });
 } else {
 const track = result.tracks[0];

 // 3. 30-minute limit check for single song
 if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
 const durationMin = Math.floor((track.duration || 0) / 60);
 embed.setColor('#FFD600')
 .setTitle(i18n.t(guildId, 'SONG_TOO_LONG_TITLE'))
 .setDescription(i18n.t(guildId, 'SONG_TOO_LONG', { duration: `${durationMin} min` }));
 return interaction.followUp({ embeds: [embed], components: [donateRow] });
 }

 if (top && player.queue.length > 0) {
 player.queue.unshift(track);
 } else {
 player.queue.add(track);
 }

 const isPlaying = (player.playing || player._starting);
 const msgKey = !isPlaying ? 'NOW_PLAYING' : (top ? 'SUPPORTER_PRIORITY_ADDED' : 'ADDED_QUEUE');
 embed.setDescription(`**${track.title}**\n\n${i18n.t(guildId, msgKey)}`);
 await interaction.followUp({ embeds: [embed] });
 }

 if (!player.playing && !player._starting && !player.paused) {
 try {
 await player.play();
 } catch (error) {
 console.error('[gplay] Play error:', error.message);
 return interaction.followUp({ content: i18n.t(guildId, 'PLAY_ERROR'), flags: 64 });
 }
 }
 }
};
