import pdfplumber
import json
import re

def parse_course_graph(raw_data):
    course_graph = {}
    
    # First pass: Build nodes and prerequisites
    for row in raw_data:
        if len(row) < 2:
            continue
        
        code = str(row[0]).strip().upper()
        title = str(row[1]).strip()
        
        if code not in course_graph:
            course_graph[code] = {
                "code": code,
                "title": title,
                "prereqs": [],
                "postreqs": []
            }
        else:
            course_graph[code]["title"] = title
            
        current_condition = "AND"
        
        i = 2
        while i < len(row):
            val = str(row[i]).strip()
            if not val:
                i += 1
                continue
                
            clean_text = re.sub(r'[^a-zA-Z]', '', val).upper()
            
            if clean_text in ["AND", "OR", "ANDOR"]:
                current_condition = "OR" if clean_text in ["OR", "ANDOR"] else "AND"
                
                if current_condition == "OR" and len(course_graph[code]["prereqs"]) > 0:
                    course_graph[code]["prereqs"][-1]["condition"] = "OR"
                i += 1
                continue
                
            is_dep = re.match(r'^[A-Z]{2,5}$', val, re.IGNORECASE)
            next_val = str(row[i+1]).strip() if i + 1 < len(row) else ""
            is_num = re.match(r'^[A-Z]\d{3}$', next_val, re.IGNORECASE)
            
            if is_dep and is_num:
                p_code = f"{val.upper()} {next_val.upper()}"
                p_title = str(row[i+2]).strip() if i + 2 < len(row) else "Unknown Title"
                
                p_type = "PRE"
                skip_elements = 2
                
                for j in range(1, 4):
                    if i + 2 + j < len(row):
                        look_ahead = re.sub(r'[^a-zA-Z]', '', str(row[i+2+j])).upper()
                        if look_ahead in ["PRE", "CO"]:
                            p_type = look_ahead
                            skip_elements = 2 + j
                            break
                            
                course_graph[code]["prereqs"].append({
                    "code": p_code,
                    "title": p_title,
                    "type": p_type,
                    "condition": current_condition
                })
                
                i += skip_elements
                current_condition = "AND"
            else:
                i += 1
                
    # Second pass: Compute postreqs
    for code, data in list(course_graph.items()):
        for prereq in data["prereqs"]:
            p_code = prereq["code"]
            if p_code in course_graph:
                # Add to postreqs
                # Avoid duplicates
                if not any(p["code"] == code for p in course_graph[p_code]["postreqs"]):
                    course_graph[p_code]["postreqs"].append({
                        "code": code,
                        "title": data["title"],
                        "type": prereq["type"],
                        "condition": prereq["condition"]
                    })
            else:
                # If prereq is not in graph, add it as a node with empty lists
                course_graph[p_code] = {
                    "code": p_code,
                    "title": prereq["title"],
                    "prereqs": [],
                    "postreqs": [{
                        "code": code,
                        "title": data["title"],
                        "type": prereq["type"],
                        "condition": prereq["condition"]
                    }]
                }
                
    # Format into list
    return list(course_graph.values())

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

    # Process cleaned data into final JSON structure
    final_data = parse_course_graph(cleaned_data)

    # Save the compressed, cleaned array
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=4)
        
    print(f"Successfully exported {len(final_data)} structured courses to {output_json}")

if __name__ == "__main__":
    # Ensure this matches your PDF filename exactly
    extract_cleaned_rows("prereqs.pdf")