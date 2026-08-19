// Compatibility shim: older dashboard/live-play code still imports StoryArcTracker.
// The product model no longer treats sessions/chapters as the campaign backbone;
// persistent quests now fill this role. Keeping this path avoids a risky wide
// import refactor while the GM workflow is being simplified.
export { default } from './QuestManager';
