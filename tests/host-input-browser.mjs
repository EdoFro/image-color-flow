import assert from 'node:assert/strict';

// Actual pointer coordinates exercise hit testing through inert/pointer-events frames.
export async function verifyHostInput(context, url) {
  const page = await context.newPage();
  await page.goto(url); await page.waitForFunction(() => a.ready && b.ready && c.ready);
  await page.evaluate(() => {
    window.actions = []; window.helpClicks = 0;
    const original = sequence.input;
    sequence.input = action => { actions.push(action); return original(action); };
    document.getElementById('helpButton').addEventListener('click', () => helpClicks++);
  });
  const snapshot = () => page.evaluate(() => ({ slide, index: sequence.index, a:a.state, b:b.state, c:c.state, actions:[...actions], text:document.getElementById('text').hidden }));
  async function actionButton(action, key) {
    const count = (await snapshot()).actions.length;
    const button = page.locator(`[data-tinta-color-action="${action}"]`);
    if (key) { await button.focus(); await page.keyboard.press(key); }
    else if (await button.locator('span').count()) await button.locator('span').click();
    else await button.click();
    await page.waitForFunction(n => actions.length > n, count);
    assert.deepEqual((await snapshot()).actions.slice(count), [action], 'A button must perform only its own action');
  }
  async function imageClick(id, margin = false) {
    const frame = page.locator('#'+id); await frame.scrollIntoViewIfNeeded(); const bounds = await frame.boundingBox();
    const x = bounds.x + (margin ? 5 : bounds.width/2), y = bounds.y + (margin ? 5 : bounds.height/2);
    assert.notEqual(await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.tagName,{x,y}), 'IFRAME');
    await page.mouse.click(x,y);
    assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'IFRAME');
  }
  assert.equal((await snapshot()).slide,0);
  assert.equal(await page.locator('[data-tinta-color-action="restart"]').isDisabled(),true);
  await page.locator('[data-slide="0"] p').click(); await page.waitForFunction(()=>slide===1&&sequence.index===1);
  assert.equal((await snapshot()).a.atStart,true);
  const frames = await Promise.all(['a','b','c'].map(async id => (await page.locator('#'+id).elementHandle()).contentFrame()));
  for (const id of ['a','b','c']) assert.equal(await page.locator('#'+id).evaluate(f=>f.inert&&f.tabIndex===-1&&getComputedStyle(f).pointerEvents==='none'),true);
  for (const frame of frames) assert.equal(await frame.evaluate(()=>document.body.inert&&TintaColorPlayer.getState().interaction==='host'),true);
  // Neither Tab nor programmatic focus can put keyboard input inside a connected animation.
  await page.locator('#notes').focus();
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'IFRAME');}
  await frames[0].evaluate(()=>document.getElementById('painting').focus());
  assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'IFRAME');
  const before = (await snapshot()).actions.length;
  await page.locator('#notes').fill('Escribir no debe avanzar'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
  await page.locator('#helpButton').click(); assert.equal(await page.evaluate(()=>helpClicks),1);
  assert.equal(await page.locator('#help').isVisible(),true); await page.locator('#help').click(); await page.locator('#helpLink').click();
  assert.equal((await snapshot()).actions.length,before,'Native/custom controls must not also advance');
  await imageClick('a'); await page.waitForFunction(()=>a.state.playing&&a.state.position===0);
  assert.equal((await snapshot()).slide,1);
  assert.equal((await page.evaluate(()=>a.advanceWhenIdle())).reason,'busy');
  await imageClick('a',true); await page.waitForFunction(()=>a.state.playing&&a.state.position===1);
  await imageClick('b'); await page.waitForFunction(()=>a.state.playing&&a.state.position===2);
  assert.equal((await snapshot()).b.atStart,true,'Clicking an inactive picture still targets the presentation sequence');
  await imageClick('b',true); await page.waitForFunction(()=>a.state.ended);
  assert.equal((await snapshot()).text,true); assert.equal((await snapshot()).index,1);
  for(const frame of frames) assert.equal(await frame.locator('#finishRestart').isVisible(),false);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(()=>!document.getElementById('text').hidden&&sequence.index===3);
  await imageClick('a',true); await page.waitForFunction(()=>b.state.playing);
  await actionButton('back'); await page.waitForFunction(()=>b.state.atStart); assert.equal((await snapshot()).slide,1);
  await actionButton('finish'); await page.waitForFunction(()=>b.state.ended); assert.equal((await snapshot()).index,3);
  await actionButton('restart'); await page.waitForFunction(()=>b.state.atStart); assert.equal((await snapshot()).b.playing,false);
  await actionButton('restart','Space'); assert.equal((await snapshot()).b.atStart,true);
  await actionButton('finish','Enter'); await page.waitForFunction(()=>b.state.ended);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(()=>slide===2);
  assert.equal(await page.locator('[data-tinta-color-action="restart"]').isDisabled(),true);
  await page.locator('[data-slide="2"] p').click(); await page.waitForFunction(()=>slide===3&&sequence.index===6);
  await imageClick('c'); await page.waitForFunction(()=>c.state.playing);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(()=>c.state.position===1&&c.state.playing);
  await page.keyboard.press('Home'); await page.waitForFunction(()=>c.state.atStart); assert.equal((await snapshot()).c.playing,false);
  await page.keyboard.press('End'); await page.waitForFunction(()=>c.state.ended); assert.equal((await snapshot()).index,6);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(()=>sequence.index===7);
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(()=>sequence.index===6&&c.state.ended);
  await actionButton('back'); await page.waitForFunction(()=>c.state.position===1&&c.state.waiting);
  await page.keyboard.press('Home'); await page.waitForFunction(()=>c.state.atStart);
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(()=>slide===2);
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(()=>slide===1);
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(()=>sequence.index===3&&b.state.ended);
  await actionButton('restart-sequence'); await page.waitForFunction(()=>slide===0&&sequence.index===0&&a.state.atStart&&b.state.atStart&&c.state.atStart);
  assert.equal((await snapshot()).text,true);
  // Same root rebound once replaces the previous binding instead of doubling inputs.
  await page.evaluate(()=>{window.rebound=[];window.replacement=TintaColorHost.bindInput({onAction:action=>rebound.push(action)});input.destroy();});
  await page.locator('[data-slide="0"] p').click(); assert.deepEqual(await page.evaluate(()=>rebound),['advance']);
  await page.evaluate(()=>replacement.destroy()); await page.locator('[data-slide="0"] p').click(); assert.deepEqual(await page.evaluate(()=>rebound),['advance']);
  // A wrong sender/channel cannot mutate the model; child input is ignored even with the channel.
  const token=await page.locator('#a').getAttribute('src').then(s=>new URLSearchParams(new URL(s).hash.slice(1)).get('tc-channel'));
  await frames[1].evaluate(token=>parent.postMessage({protocol:'tinta-color',version:1,channel:token,kind:'event',event:'state',state:{ended:true}},'*'),token);
  await page.evaluate(()=>document.getElementById('a').contentWindow.postMessage({protocol:'tinta-color',version:1,channel:'0'.repeat(48),kind:'command',id:1,command:'finish'},'*'));
  await frames[0].evaluate(token=>parent.postMessage({protocol:'tinta-color',version:1,channel:token,kind:'input',action:'advance'},'*'),token);
  await page.evaluate(()=>a.command('state')); assert.equal((await snapshot()).a.atStart,true); assert.equal((await snapshot()).slide,0);
  return {page, frames, snapshot};
}
