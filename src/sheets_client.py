"""Two interchangeable sources of campaign rows: a real Google Sheet, or a
local CSV used for testing/demo runs when no Google credentials are set up
yet. Both expose read_campaigns() -> list[dict] and write_status(row_index,
status, draft_link, timestamp) so src/main.py doesn't care which one it has.
"""
import csv
import os

from src import config


class GoogleSheetsClient:
    def __init__(self, sheet_id=None, tab=None, service_account_file=None):
        import gspread
        from google.oauth2.service_account import Credentials

        sheet_id = sheet_id or config.GOOGLE_SHEET_ID
        tab = tab or config.GOOGLE_SHEET_TAB
        service_account_file = service_account_file or config.GOOGLE_SERVICE_ACCOUNT_FILE

        if not sheet_id:
            raise RuntimeError("GOOGLE_SHEET_ID is not set. See .env.example.")
        if not os.path.exists(service_account_file):
            raise RuntimeError(
                f"Google service account file not found at '{service_account_file}'. "
                "See .env.example / README for how to create one."
            )

        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        creds = Credentials.from_service_account_file(service_account_file, scopes=scopes)
        client = gspread.authorize(creds)
        self._worksheet = client.open_by_key(sheet_id).worksheet(tab)

    def read_campaigns(self):
        return self._worksheet.get_all_records()

    def write_status(self, row_index, status, draft_link, timestamp):
        # row_index is 0-based within the data rows; sheet row = data row + 2
        # (row 1 is the header).
        sheet_row = row_index + 2
        headers = self._worksheet.row_values(1)

        def set_col(col_name, value):
            if col_name in headers:
                col = headers.index(col_name) + 1
                self._worksheet.update_cell(sheet_row, col, value)

        set_col("Status", status)
        set_col("Draft Link", draft_link)
        set_col("Last Run", timestamp)


class SampleCsvClient:
    """Reads/writes a local CSV so the whole pipeline can be exercised and
    demoed without any Google credentials."""

    def __init__(self, csv_path):
        self.csv_path = csv_path

    def read_campaigns(self):
        with open(self.csv_path, newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))

    def write_status(self, row_index, status, draft_link, timestamp):
        rows = self.read_campaigns()
        if row_index >= len(rows):
            return
        rows[row_index]["Status"] = status
        rows[row_index].setdefault("Draft Link", "")
        rows[row_index]["Draft Link"] = draft_link
        rows[row_index].setdefault("Last Run", "")
        rows[row_index]["Last Run"] = timestamp

        fieldnames = list(rows[0].keys())
        with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
