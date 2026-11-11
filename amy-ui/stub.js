// Falsk window.claude for UI-sjekk. Dokumenter kommer fra window.__DOCS (nøkkel = siste del av stien).
window.__CALLS=[];window.__SETS=[];window.__DOCS=window.__DOCS||{};
(()=>{const mk=path=>({onSnapshot(cb){const k=path.split('/').pop(),d=window.__DOCS[k];setTimeout(()=>{try{cb({exists:!!d,data:()=>d||{}})}catch(e){console.error('snap',k,e)}},0);return()=>{}},
  set:async v=>{window.__SETS.push([path,v])},update:async v=>{window.__SETS.push([path,v])},get:async()=>({exists:false,data:()=>({})}),
  collection:n=>({doc:id=>mk(path+'/'+n+'/'+id),onSnapshot(){return()=>{}},get:async()=>({docs:[],forEach(){}})})});
 const db={doc:mk,collection:n=>({doc:id=>mk(n+'/'+id),onSnapshot(){return()=>{}},get:async()=>({docs:[],forEach(){}})})};
 const mcp={callTool:async(server,tool,args)=>{window.__CALLS.push({server,tool,args});return{payload:{data:[]}}},status:async()=>({}),servers:async()=>[]};
 const user={id:async()=>'u_test',profile:async()=>({name:'Test'})};
 window.claude={use:async n=>n==='db'?db:n==='mcp'?mcp:n==='user'?user:null}})();
