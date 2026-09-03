import { TREND_SIGNAL_SNAPSHOT } from './trendSignalSnapshot.js';

const freezeSignals=signals=>Object.freeze(signals.map(signal=>Object.freeze(signal)));
const market=(value)=>Object.freeze({...value,signals:freezeSignals(value.signals||[])});

// Initial bounded fusion snapshot. Raw third-party app identities are never stored here.
// MY is the primary market; ID is the current Southeast Asia peer sample; US is the global sample.
// Weekly automation refreshes these anonymous pattern/rank signals from official Apple feeds.
export const TREND_FUSION_SNAPSHOT=Object.freeze({
  schemaVersion:1,
  primaryMarket:'MY',
  markets:Object.freeze([
    market({
      market:'MY',
      marketGroup:'SEA',
      observedAt:TREND_SIGNAL_SNAPSHOT.observedAt,
      sourceId:'apple-app-store-rss',
      sourceKind:'official-store-chart',
      sourceUrl:TREND_SIGNAL_SNAPSHOT.sourceUrl,
      chartSize:TREND_SIGNAL_SNAPSHOT.chartSize,
      trust:1,
      signals:TREND_SIGNAL_SNAPSHOT.signals,
    }),
    market({
      market:'ID',
      marketGroup:'SEA',
      observedAt:'2026-08-30T02:31:31.000Z',
      sourceId:'apple-app-store-rss',
      sourceKind:'official-store-chart',
      sourceUrl:'https://rss.marketingtools.apple.com/api/v2/id/apps/top-free/100/apps.json',
      chartSize:100,
      trust:1,
      signals:[
        {patternId:'mobile-wallet',rank:2,chart:'all'},
        {patternId:'map-navigation',rank:3,chart:'all'},
        {patternId:'photo-editor-ai',rank:4,chart:'all'},
        {patternId:'banking-dashboard',rank:6,chart:'all'},
        {patternId:'ecommerce-marketplace',rank:7,chart:'all'},
        {patternId:'social-thread-feed',rank:8,chart:'all'},
        {patternId:'video-editor-mobile',rank:9,chart:'all'},
        {patternId:'ai-search-answer',rank:10,chart:'all'},
        {patternId:'ai-assistant-chat',rank:11,chart:'all'},
        {patternId:'private-messaging',rank:12,chart:'all'},
      ],
    }),
    market({
      market:'US',
      marketGroup:'GLOBAL',
      observedAt:'2026-09-03T15:21:16.000Z',
      sourceId:'apple-app-store-rss',
      sourceKind:'official-store-chart',
      sourceUrl:'https://rss.marketingtools.apple.com/api/v2/us/apps/top-free/100/apps.json',
      chartSize:100,
      trust:1,
      signals:[
        {patternId:'map-navigation',rank:1,chart:'all'},
        {patternId:'ai-assistant-chat',rank:2,chart:'all'},
        {patternId:'ecommerce-marketplace',rank:3,chart:'all'},
        {patternId:'short-video-feed',rank:4,chart:'all'},
        {patternId:'fantasy-sports',rank:5,chart:'all'},
        {patternId:'short-drama-stream',rank:8,chart:'all'},
        {patternId:'social-thread-feed',rank:10,chart:'all'},
        {patternId:'private-messaging',rank:12,chart:'all'},
        {patternId:'video-editor-mobile',rank:13,chart:'all'},
        {patternId:'email-inbox',rank:14,chart:'all'},
        {patternId:'coffee-ordering',rank:16,chart:'all'},
        {patternId:'banking-dashboard',rank:17,chart:'all'},
        {patternId:'team-collaboration',rank:23,chart:'all'},
        {patternId:'browser-search',rank:27,chart:'all'},
        {patternId:'photo-social-feed',rank:35,chart:'all'},
      ],
    }),
  ]),
});
