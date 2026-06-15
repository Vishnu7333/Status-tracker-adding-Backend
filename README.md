# 3D Test Execution Summary

A lightweight web app to track test cases, calculate pass/fail/onhold totals, show module-wise summaries, and export a JSON summary file.

## Features

- Add test cases with module, submodule, status, and comment
- Status support for Pass, Fail, OnHold, and Pending
- Table view of module/submodule test cases
- Overall total and status counts
- Module-wise 3D visualization using Three.js
- Export summary to `test-execution-summary.json`

## Usage

1. Open `index.html` in a browser.
2. Enter module, test case name, status, and optional comment.
3. Click `Add Test Case`.
4. Review the totals and 3D visualization.
5. Click `Export Summary` to download the summary JSON.

## Notes

- This is a static app; no backend is required.
- It is built using plain HTML, CSS, and JavaScript with Three.js from CDN.
