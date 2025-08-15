import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://cerply:cerply@db:5432/cerply' });
const rid = (p) => p + '-' + Math.random().toString(36).slice(2,10);

async function run(){
  console.log('Seeding demo...');
  const artefactId = rid('art');
  await pool.query(
    "INSERT INTO artefacts(id,type,title,source_uri,uploaded_by) VALUES($1,$2,$3,$4,$5)",
    [artefactId,'policy','AML & Records Policy','s3://demo/aml.pdf','user-admin']
  );

  const objs = [rid('obj'), rid('obj'), rid('obj')];
  const objTexts = ['Records retention basics','KYC onboarding','Sanctions screening'];
  for (let i=0;i<3;i++){
    await pool.query(
      "INSERT INTO objectives(id,artefact_id,text,taxonomy) VALUES($1,$2,$3,$4)",
      [objs[i], artefactId, objTexts[i], ['AML','Policy']]
    );
  }

  const statuses = ['DRAFT','QA','PUBLISHED'];
  const trust = [null,'TRAINER_CERTIFIED','CERPLY_CERTIFIED'];
  const items = [];
  for (let i=0;i<12;i++){
    const id = rid('itm');
    const obj = objs[i%3];
    const vg = 'vg-'+(1+(i%3));
    await pool.query(
      "INSERT INTO items(id,objective_id,stem,options,correct_index,explainer,variant_group_id,status,version,trust_label,trust_mapping_refs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [id,obj,`Q${i+1}: Which step comes first?`,['Collect ID','Verify ID','Screen sanctions','Approve'],0,'Collect and verify ID before approval.',vg,statuses[i%3],1,trust[i%3], ['FCA:SYSC3']]
    );
    items.push(id);
  }

  // 30 users x attempts
  for (let u=1; u<=30; u++){
    const user = 'user-'+u;
    for (const it of items){
      const isCorrect = Math.random() < (0.55 + (u%5)*0.08);
      await pool.query(
        "INSERT INTO attempts(id,user_id,item_id,is_correct,response_time_ms,confidence) VALUES($1,$2,$3,$4,$5,$6)",
        [rid('att'), user, it, isCorrect, 1000+Math.floor(Math.random()*3000), 1+Math.floor(Math.random()*5)]
      );
    }
  }

  // spaced schedules for user-1
  for (const o of objs){
    await pool.query(
      "INSERT INTO spaced_schedules(id,user_id,objective_id,next_due_at,interval_days,easing_state) VALUES($1,$2,$3, now() + interval '2 days', 2, 'easeUp')",
      [rid('sch'),'user-1',o]
    );
  }

  console.log('Demo seed complete.');
  await pool.end();
}
run().catch(e=>{console.error(e);process.exit(1)});
