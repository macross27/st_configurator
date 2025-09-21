import pyautogui
import os

# Take screenshot
screenshot = pyautogui.screenshot()
screenshot_path = os.path.join(os.getcwd(), 'screenshot.png')
screenshot.save(screenshot_path)
print(f"Screenshot saved to: {screenshot_path}")