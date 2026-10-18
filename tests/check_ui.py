from playwright.sync_api import sync_playwright
from pathlib import Path
import re
base=Path('/mnt/data/RUJUKAN_AI_FAQ_KANTAH_V2/docs')
html=(base/'index.html').read_text()
html=re.sub(r'<link[^>]+(?:fonts.googleapis|fonts.gstatic|styles\.css)[^>]*>','',html)
html=re.sub(r'<script[^>]+src="(?:config|app)\.js"[^>]*></script>','',html)
css=(base/'styles.css').read_text()
js=(base/'app.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 for name,viewport in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
  page=browser.new_page(viewport=viewport,device_scale_factor=1)
  errs=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.add_script_tag(content='window.RUJUKAN_CONFIG={API_URL:"",LOGO_URL:""}');page.add_script_tag(content=js)
  page.wait_for_timeout(400)
  assert 'Biro Perencanaan dan Kerja Sama' in page.locator('body').inner_text()
  assert page.locator('#welcomeArea').is_visible()
  print('DEBUG STATUS:', page.locator('#connectionText').inner_text(), 'ERRORS:',errs)
  assert 'demo' in page.locator('#connectionText').inner_text().lower()
  path=f'/mnt/data/RUJUKAN_AI_FAQ_KANTAH_V2_PREVIEW_{name.upper()}.png'
  page.screenshot(path=path,full_page=True)
  page.locator('.suggestion-card').first.click()
  assert page.locator('.message.user').count()==1
  assert page.locator('.message.assistant').count()==1
  page.locator('#openSettings').click()
  assert page.locator('#settingsModal').is_visible()
  page.locator('#closeSettings').click()
  assert not page.locator('#settingsModal').is_visible()
  if name=='mobile':
   page.locator('#menuButton').click()
   assert page.locator('#sidebar').evaluate("e=>e.classList.contains('open')")
  page.locator('#newChat').click()
  assert page.locator('#welcomeArea').is_visible()
  assert not errs,errs
  print(name,'PASS',path)
  page.close()
 browser.close()
