const {test}=require('node:test');
const assert=require('node:assert/strict');
const {playerDisplayBounds,isSafePlayerDisplayUrl}=require('../playerDisplayWindow');
test('audience window uses the second monitor including negative coordinates',()=>{
 assert.deepEqual(playerDisplayBounds([{id:1,workArea:{x:0,y:0,width:1440,height:900}},{id:2,workArea:{x:-1920,y:0,width:1920,height:1080}}],1),{x:-1920,y:0,width:1920,height:1080,minWidth:800,minHeight:480});
});
test('single monitor and invalid bounds safely use normal window placement',()=>{
 assert.equal(playerDisplayBounds([{id:1}],1),null);
 assert.equal(playerDisplayBounds([{id:2,workArea:{x:0,y:0,width:0,height:0}}],1),null);
});
test('display route safety remains restricted to the audience route',()=>{
 assert.equal(isSafePlayerDisplayUrl('rqk://desktop/player-display/campaign?target=standing-tv'),true);
 assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/campaign'),false);
 assert.equal(isSafePlayerDisplayUrl('https://example.com/player-display/campaign'),false);
});
