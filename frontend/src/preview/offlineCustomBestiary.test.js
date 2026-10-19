import { createPreviewApi } from './previewApi';
import { mergeDesktopWorkspace } from './desktopCampaignPack';
import { canUseCombatRecord } from '@/lib/combatReadiness';

test('imported custom creatures are readable and editable offline without losing other collections', () => {
  const original={version:1,campaigns:[{id:'fixture',name:'Synthetic'}],characters:[],collections:{fixture:{maps:[{id:'map',name:'Keep map'}]}},notes:[],recaps:[],objects:{},receipts:{},homebrew:[]};
  const incoming={...original,campaigns:[],collections:{fixture:{'custom-creatures':[{id:'guard',name:'Guard',hp:12,ac:14,actions:[{name:'Spear'}]},{id:'story',name:'Story',combat_ready:false,hp:null,ac:null,actions:[]}]}}};
  let saved=JSON.stringify(mergeDesktopWorkspace(original,incoming,{campaignUpdate:true}));
  const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
  const options={readOnly:false,user:'Local Keeper',storageKey:'test'};
  const api=createPreviewApi(storage,options);
  expect(api.request('get','/campaigns/fixture/custom-creatures')).toHaveLength(2);
  expect(api.request('get','/campaigns/fixture/custom-creatures').filter(canUseCombatRecord)).toHaveLength(1);
  api.request('patch','/campaigns/fixture/custom-creatures/guard',{notes:'Edited locally'});
  const reloaded=createPreviewApi(storage,options);
  expect(reloaded.request('get','/campaigns/fixture/custom-creatures/guard')).toMatchObject({notes:'Edited locally',actions:[{name:'Spear'}]});
  expect(reloaded.request('get','/campaigns/fixture/maps')).toEqual(original.collections.fixture.maps);
  const created=reloaded.request('post','/campaigns/fixture/custom-creatures',{name:'New reference',combat_ready:false});
  reloaded.request('delete',`/campaigns/fixture/custom-creatures/${created.id}`);
  expect(reloaded.request('get','/campaigns/fixture/custom-creatures')).toHaveLength(2);
});
