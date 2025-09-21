# Manual Browser Testing Guide

## Step 1: Open Browser and Navigate
1. Open Chrome/Firefox browser
2. Navigate to: `http://localhost:3026`
3. **Take a screenshot or describe what you see**

## Step 2: Check Console for Errors
1. Press `F12` to open Developer Tools
2. Click on "Console" tab
3. **Look for RED error messages**
4. **Take a screenshot of any errors**

Common errors to look for:
- `Uncaught ReferenceError`
- `TypeError: Cannot read property`
- `Failed to load resource`
- `CORS errors`
- `CSP violation errors`

## Step 3: Test Button Functionality

### Order Form Button Test:
1. Look for a button labeled "주문서 작성" (Create Order) on the left panel
2. Click the button
3. **Record what happens:**
   - Does a modal/form open?
   - Are there any console errors?
   - Does nothing happen?

### Submit Button Test:
1. Look for a button labeled "주문 제출" (Submit Order) on the left panel
2. Click the button
3. **Record what happens:**
   - Does anything happen?
   - Are there any console errors?
   - Does it show an error message?

## Step 4: Check 3D Viewer
1. Look at the main area (right side) for a 3D view
2. **Check if you see:**
   - A black/gray 3D viewer area?
   - Any 3D model visible?
   - Is the viewer completely empty/white?

## Step 5: Test Layer Controls
1. On the left panel, look for "텍스트 추가" (Add Text) button
2. Click it
3. **Record what happens:**
   - Does it add a text layer?
   - Any console errors?

## Step 6: Network Tab Check
1. In Developer Tools, click "Network" tab
2. Refresh the page (F5)
3. **Look for RED failed requests:**
   - Any 404 errors?
   - Any CORS errors?
   - Failed API calls?

## Step 7: Check for JavaScript Initialization
Open Console and type:
```javascript
window.uniformConfigurator
```
**Expected result:** Should show an object, not "undefined"

## Expected Working Behavior

### ✅ What SHOULD work:
- Page loads without errors
- 3D viewer shows a gray/black area
- Order button opens a modal form
- Submit button shows some response
- Add text/logo buttons work
- No red errors in console

### ❌ Common Issues to Report:
- "application initialization failed" in console
- Buttons don't respond to clicks
- 3D viewer is completely empty
- Modal forms don't open
- JavaScript errors on page load

## Quick JavaScript Test
In the browser console, try these commands:

```javascript
// Test if managers are initialized
console.log('OrderFormManager:', window.orderFormManagerInstances);
console.log('Three.js:', window.THREE);

// Test button elements exist
console.log('Order button:', document.getElementById('order-btn'));
console.log('Submit button:', document.getElementById('submit-btn'));
```

## Report Template

Please provide this information:

1. **Page Load Status**: Does the page load completely?
2. **Console Errors**: List any red errors from console
3. **Button Behavior**: What happens when clicking order/submit buttons?
4. **3D Viewer Status**: Is anything visible in the 3D area?
5. **Network Errors**: Any failed requests in Network tab?
6. **JavaScript Test Results**: Output from the console test commands

This will help identify the real issues versus assumed problems.