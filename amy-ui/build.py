import sys
s=open('orig.html',encoding='utf8').read(); L=open('layer.js',encoding='utf8').read()
a="AREF=db.doc('data/users/'+id+'/aksjeanalyse');"; assert s.count(a)==1
s=s.replace(a,a+"MREF=db.doc('data/users/'+id+'/motor');try{MREF.onSnapshot(mRead,()=>{})}catch(e){}")
b="- Vurder kurtasje og skatt (på aksjesparekonto skattes gevinst først ved uttak ut over innskuddet)."; assert s.count(b)==1
s=s.replace(b,"- Vurder kurtasje og skatt. Dette er en vanlig aksjekonto: gevinst skattes med 37,84 % ved hvert salg, så et bytte må lønne seg etter skatt og kurtasje.")
c="\ninitSync();\n"; assert s.count(c)==1
s=s.replace(c,"\n"+L+"initSync();\n")
open('index.html','w',encoding='utf8').write(s); print(len(s))
