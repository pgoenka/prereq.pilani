import pdfplumber
import json
import re

def extract_cleaned_rows(pdf_path, output_json="data.json"):
    cleaned_data = []
    
    # Regex to catch dates like "24-Jan-15" or "9-Jul-24"
    date_pattern = re.compile(r"^\d{1,2}-[A-Za-z]{3}-\d{2}$")

    print(f"Extracting and cleaning tables from {pdf_path}...")
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            
            # Fallback if grid lines are missing
            if not table:
                table = page.extract_table(
                    table_settings={"vertical_strategy": "text", "horizontal_strategy": "text"}
                )
                
            if table:
                for row in table:
                    # Basic string cleanup for the whole row first
                    str_row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                    
                    # Ensure the row actually has enough columns before we slice it
                    if len(str_row) > 3:
                        
                        # 1. Remove the first 3 entries (Course ID, Subject, Catalog)
                        sliced_row = str_row[3:]
                        
                        # 2. Filter out empty strings ("") and dates
                        filtered_row = [
                            item for item in sliced_row 
                            if item != "" and not date_pattern.match(item)
                        ]
                        
                        # Only append if there is actual course data left (e.g., Code and Title)
                        if filtered_row and len(filtered_row) >= 2:
                            cleaned_data.append(filtered_row)

    # Save the highly compressed, cleaned array
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=4)
        
    print(f"Successfully exported {len(cleaned_data)} cleaned rows to {output_json}")

if __name__ == "__main__":
    # Ensure this matches your PDF filename exactly
    extract_cleaned_rows("prereqs.pdf")