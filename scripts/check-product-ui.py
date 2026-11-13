"""Optional local browser regression; requires Playwright and Chromium, with npm run demo running."""
import json,os,shutil,tempfile
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
   available=[q for q in sub['questions'] if not q.get('archived')]
   expect(page.locator('#question-item option')).to_have_count(len(available))
   for q in available:
    page.select_option('#question-item',q['id']);settled();checked+=1
    expect(page.locator('.stone')).to_be_visible() if q['mode']=='narrative' else expect(page.locator('.stone')).not_to_be_visible()
    if category['id']=='health':
     expect(page.locator('#source-panel')).not_to_be_visible()
     expect(page.locator('#context-panel')).not_to_be_visible()
     expect(page.locator('#story')).to_contain_text('医疗专业人员')
 page.select_option('#domain','career');page.select_option('#subcategory','career.interview');page.select_option('#question-item','career.interview.interview-pass')
 page.select_option('#primary','48');page.select_option('#moving','5');page.select_option('#month','亥');page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story')).to_contain_text('本月21、22号');expect(page.locator('#story .short-reading')).to_have_count(1)
 expect(page.locator('#story .short-reading')).not_to_contain_text('应期')
 expect(page.locator('#story .timing-section')).to_be_visible()
 expect(page.locator('#story .timing-section')).to_contain_text('传统推算的参考窗口')
 expect(page.locator('#story .timing-window')).to_have_count(2)
 expect(page.locator('#story .long-reading')).not_to_contain_text('本月21、22号')
 for branch in '寅卯辰巳午未申酉戌亥子丑':
  page.select_option('#month',branch);page.click('#view-button');settled()
  expect(page.locator('#story .short-reading')).to_have_count(1)
  expect(page.locator('#story')).not_to_contain_text('批准的扩展规则')
 page.select_option('#month','亥');page.select_option('#primary','16');page.select_option('#moving','2');page.click('#view-button');settled()
 expect(page.locator('#story .short-reading')).not_to_contain_text('半空')
 expect(page.locator('#story .long-reading')).not_to_contain_text('半空')
 expect(page.locator('#story .calculation-explanation')).not_to_have_attribute('open','')
 page.locator('#story .calculation-explanation summary').click()
 expect(page.locator('#story .calculation-explanation')).not_to_contain_text('半空')
 page.select_option('#primary','5');page.select_option('#moving','2');page.select_option('#month','子');page.locator('#casting-date').fill('2026-12-10');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story .timing-section')).to_contain_text('本月12、13号')
 expect(page.locator('#story .timing-section')).not_to_contain_text('本月18、19号')
 page.select_option('#month','卯')
 for date,days,ganzhi in [('2027-03-20','本月30、31号','戊戌'),('2028-03-20','本月24、25号','甲辰')]:
  page.locator('#casting-date').fill(date);page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
  expect(page.locator('#story .timing-section')).to_contain_text(days)
  expect(page.locator('#story .short-reading')).not_to_contain_text('应期')
  calc=page.locator('#story .calculation-explanation')
  expect(calc).to_contain_text('月令：卯月');expect(calc).not_to_contain_text('月令：寅月')
  expect(calc).to_contain_text(date+'，'+ganzhi+'日');expect(calc).not_to_contain_text('旬空')
 page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.select_option('#month','亥');page.click('#view-button');settled()
 page.select_option('#primary','1');page.select_option('#moving','5');page.select_option('#month','酉');page.click('#view-button');settled()
 expect(page.locator('#story .short-reading')).to_have_count(1);expect(page.locator('#story h3')).to_contain_text('有望通过')
 page.select_option('#month','午');page.click('#view-button');settled()
 expect(page.locator('#story h3')).to_contain_text('通过偏难')
 page.select_option('#primary','64');page.select_option('#moving','6');page.select_option('#month','亥');page.click('#view-button');settled()
 expect(page.locator('#story .short-reading')).to_have_count(1);expect(page.locator('#story .timing-section')).to_be_visible()
 page.select_option('#primary','40');page.select_option('#moving','5');page.click('#view-button');settled()
 expect(page.locator('#context tbody tr').filter(has_text='体互')).to_contain_text('假空')
 page.select_option('#question-item','career.interview.job-offer');settled()
 expect(page.locator('#context tbody tr').filter(has_text='体互')).to_contain_text('假空')
 page.select_option('#domain','wealth');page.select_option('#subcategory','wealth.debt');page.select_option('#question-item','wealth.debt.receivable')
 page.select_option('#primary','48');page.select_option('#moving','5');page.select_option('#month','亥');page.locator('#casting-date').fill('2026-11-11');page.locator('#casting-date').dispatch_event('change');page.click('#view-button');settled()
 expect(page.locator('#story')).to_contain_text('还在核对')
 page.select_option('#domain','search');page.select_option('#subcategory','search.lost-object');page.select_option('#question-item','search.valuables.recovery')
 page.select_option('[data-product-context="objectKind"]','phone');settled();expect(page.locator('#story')).to_contain_text('远程锁定')
 page.select_option('[data-product-context="objectKind"]','wallet');settled();expect(page.locator('#story')).to_contain_text('锁卡');expect(page.locator('#story')).not_to_contain_text('远程锁定')
 page.select_option('#subcategory','search.missing-contact');page.select_option('#question-item','search.person-leads.guidance');settled();expect(page.locator('#story')).to_contain_text('可信');expect(page.locator('.stone')).not_to_be_visible()
 page.select_option('#domain','health');page.select_option('#subcategory','health.illness');page.select_option('#question-item','health.severity.severity');settled()
 page.screenshot(path=str(Path(tempfile.gettempdir())/'wengua-product-health.png'),full_page=True)
 page.select_option('#domain','career');page.select_option('#subcategory','career.interview');page.select_option('#question-item','career.interview.job-offer');settled()
 page.screenshot(path=str(Path(tempfile.gettempdir())/'wengua-product-career.png'),full_page=True)
 assert not errors,errors
 assert checked==80
 print(json.dumps({'categories':6,'subcategories':31,'questions':checked,'twelveMonthOptions':12,'interviewCalculationCollapsible':True,'castDateRecalculated':True,'actualMaoMonthAndFutureYears':True,'separateTimingSection':True,'fullBaseNewCases':True,'healthPatientChartsHidden':True,'walletAndPhoneActionsDistinct':True,'pageErrors':errors}))
 browser.close()
