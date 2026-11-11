"""Optional local browser regression; requires Playwright and Chromium, with npm run demo running."""
import json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'data/product-categories.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('WENGUA_BROWSER_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:'+os.environ.get('WENGUA_PORT','4173'),wait_until='networkidle')
 expect(page.locator('#domain option')).to_have_count(6)
 expect(page.locator('#month option')).to_have_count(13)
 def settled():
  page.wait_for_function("!document.querySelector('#story').textContent.includes('正在读取')")
  expect(page.locator('#error')).to_have_text('')
 checked=0
 for category in catalog['categories']:
  page.select_option('#domain',category['id'])
  expect(page.locator('#subcategory option')).to_have_count(len(category['subcategories']))
  for sub in category['subcategories']:
   page.select_option('#subcategory',sub['id'])
   expect(page.locator('#question-item option')).to_have_count(len(sub['questions']))
   for q in sub['questions']:
    page.select_option('#question-item',q['id']);settled();checked+=1
    expect(page.locator('.stone')).to_be_visible() if q['mode']=='narrative' else expect(page.locator('.stone')).not_to_be_visible()
    if category['id']=='health':
     expect(page.locator('#source-panel')).not_to_be_visible()
     expect(page.locator('#context-panel')).not_to_be_visible()
     expect(page.locator('#story')).to_contain_text('医疗专业人员')
 page.select_option('#domain','career');page.select_option('#subcategory','career.interview');page.select_option('#question-item','career.interview.interview-pass')
 page.select_option('#primary','48');page.select_option('#moving','5');page.select_option('#month','亥');page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story')).to_contain_text('本月21、22号');expect(page.locator('#story .short-reading')).to_have_count(1)
 for branch in '寅卯辰巳午未申酉戌亥子丑':
  page.select_option('#month',branch);page.click('#view-button');settled()
  expect(page.locator('#story .short-reading')).to_have_count(1)
  expect(page.locator('#story')).not_to_contain_text('批准的扩展规则')
 page.select_option('#month','亥');page.select_option('#primary','16');page.select_option('#moving','2');page.click('#view-button');settled()
 expect(page.locator('#story .short-reading')).not_to_contain_text('半空')
 expect(page.locator('#story .long-reading')).not_to_contain_text('半空')
 expect(page.locator('#story .calculation-explanation')).not_to_have_attribute('open','')
 half=page.locator('#story .calculation-explanation p').filter(has_text='半空')
 expect(half).not_to_be_visible()
 page.locator('#story .calculation-explanation summary').click();expect(half).to_be_visible()
 page.select_option('#primary','5');page.select_option('#moving','2');page.select_option('#month','子');page.locator('#casting-date').fill('2026-12-10');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story .long-reading')).to_contain_text('本月12、13号')
 expect(page.locator('#story .long-reading')).not_to_contain_text('本月18、19号')
 page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.select_option('#month','亥');page.click('#view-button');settled()
 page.select_option('#primary','40');page.select_option('#moving','5');page.click('#view-button');settled()
 expect(page.locator('#context tbody tr').filter(has_text='体互')).to_contain_text('假空')
 page.select_option('#question-item','career.interview.job-offer');settled()
 expect(page.locator('#context tbody tr').filter(has_text='体互')).to_contain_text('假空')
 page.select_option('#domain','wealth');page.select_option('#subcategory','wealth.debt');page.select_option('#question-item','wealth.debt.receivable')
 page.select_option('#primary','48');page.select_option('#moving','5');page.select_option('#month','亥');page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story')).to_contain_text('还在核对')
 page.select_option('#domain','search');page.select_option('#subcategory','search.valuables')
 page.select_option('[data-product-context="objectKind"]','phone');settled();expect(page.locator('#story')).to_contain_text('远程锁定')
 page.select_option('[data-product-context="objectKind"]','wallet');settled();expect(page.locator('#story')).to_contain_text('锁卡');expect(page.locator('#story')).not_to_contain_text('远程锁定')
 page.select_option('#subcategory','search.person-leads');settled();expect(page.locator('#story')).to_contain_text('可信');expect(page.locator('.stone')).not_to_be_visible()
 page.select_option('#domain','health');page.select_option('#subcategory','health.severity');settled()
 page.screenshot(path='/tmp/wengua-product-health.png',full_page=True)
 page.select_option('#domain','career');page.select_option('#subcategory','career.interview');page.select_option('#question-item','career.interview.job-offer');settled()
 page.screenshot(path='/tmp/wengua-product-career.png',full_page=True)
 assert not errors,errors
 assert checked==82
 print(json.dumps({'categories':6,'subcategories':52,'questions':checked,'twelveMonthOptions':12,'halfVoidCollapsed':True,'castDateRecalculated':True,'healthPatientChartsHidden':True,'walletAndPhoneActionsDistinct':True,'pageErrors':errors}))
 browser.close()
