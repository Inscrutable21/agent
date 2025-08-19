'use server'

import { evalOnPage } from './pageOps.js'

export async function assertSelectOptions(cdp, selector, expected) {
  const actual = await evalOnPage(
    cdp,
    `(function(){
      const sel = document.querySelector(${JSON.stringify(selector)});
      if(!sel) return { error: 'Selector not found' };
      const opts = Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
      return { options: opts };
    })()`
  )

  if (actual?.error) {
    return { pass: false, message: actual.error }
  }
  const missing = expected.filter(e => !actual.options.find(a => a.value === e.value && a.text === e.text))
  const extra = actual.options.filter(a => !expected.find(e => e.value === a.value && e.text === a.text))
  return {
    pass: missing.length === 0 && extra.length === 0,
    message: missing.length || extra.length
      ? `Mismatch. Missing: ${JSON.stringify(missing)} Extra: ${JSON.stringify(extra)}`
      : 'All options match'
  }
}

export async function assertSelectSelectable(cdp, selector) {
  const result = await evalOnPage(
    cdp,
    `(async function(){
      const sel = document.querySelector(${JSON.stringify(selector)});
      if(!sel) return { error: 'Selector not found' };
      const values = Array.from(sel.options).map(o => o.value);
      for (const v of values) {
        sel.value = v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        if (sel.value !== v) return { error: 'Selection failed for ' + v };
      }
      return { ok: true };
    })()`
  )
  if (result?.error) return { pass: false, message: result.error }
  return { pass: true, message: 'All options selectable' }
}


