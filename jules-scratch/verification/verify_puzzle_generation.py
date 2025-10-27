
from playwright.sync_api import Page, expect
import os

def test_generate_new_puzzle(page: Page):
    # Navigate to the local index.html file
    page.goto(f"file://{os.getcwd()}/index.html")

    # Click the "New Game" button
    page.get_by_role("button", name="New Game").click()

    # Select the "Hard" difficulty
    page.get_by_label("Difficulty").select_option("Hard")

    # Click the first puzzle in the list
    page.get_by_role("button", name="New Puzzle 1").click()

    # Wait for the puzzle to be generated
    expect(page.locator("#sudoku .sudoku-board-cell input").first).not_to_be_empty()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")
