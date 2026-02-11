import pypdf
import sys

def extract_pdf_text(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        text = extract_pdf_text(pdf_path)
        print(text)
    else:
        print("Usage: python extract_pdf.py <pdf_path>")
