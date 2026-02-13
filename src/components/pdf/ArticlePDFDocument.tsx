import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';

// Register fonts (Commented out temporarily to fix "Unknown font format" error)
/*
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.ttf', fontWeight: 700 },
    ],
});
*/

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        paddingTop: 60,
        paddingBottom: 80,
        paddingHorizontal: 60,
        fontFamily: 'Helvetica', // Use standard PDF font
    },
    header: {
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: 8,
        lineHeight: 1.3,
    },
    subtitle: {
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    content: {
        flex: 1,
    },
    heading1: {
        fontSize: 20,
        fontWeight: 700,
        color: '#0F172A',
        marginTop: 24,
        marginBottom: 12,
        lineHeight: 1.4,
    },
    heading2: {
        fontSize: 16,
        fontWeight: 600,
        color: '#1E293B',
        marginTop: 20,
        marginBottom: 10,
        lineHeight: 1.4,
    },
    heading3: {
        fontSize: 14,
        fontWeight: 600,
        color: '#334155',
        marginTop: 16,
        marginBottom: 8,
        lineHeight: 1.4,
    },
    paragraph: {
        fontSize: 11,
        color: '#374151',
        marginBottom: 12,
        lineHeight: 1.7,
        textAlign: 'justify',
    },
    listItem: {
        fontSize: 11,
        color: '#374151',
        marginBottom: 6,
        paddingLeft: 16,
        lineHeight: 1.6,
    },
    bulletPoint: {
        position: 'absolute',
        left: 0,
        top: 0,
        fontSize: 11,
        color: '#3B82F6',
    },
    listItemContainer: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
        paddingLeft: 16,
        marginVertical: 12,
        marginLeft: 8,
    },
    blockquoteText: {
        fontSize: 11,
        color: '#64748B',
        fontStyle: 'italic',
        lineHeight: 1.6,
    },
    codeBlock: {
        backgroundColor: '#F1F5F9',
        padding: 12,
        marginVertical: 12,
        borderRadius: 4,
    },
    codeText: {
        fontSize: 9,
        fontFamily: 'Courier',
        color: '#1E293B',
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 60,
        right: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    footerText: {
        fontSize: 8,
        color: '#94A3B8',
    },
    pageNumber: {
        fontSize: 8,
        color: '#94A3B8',
    },
    bold: {
        fontWeight: 700,
    },
});

interface ArticlePDFDocumentProps {
    title: string;
    markdown: string;
    generatedDate?: string;
}

// Simple markdown parser for PDF rendering
function parseMarkdownToElements(markdown: string): React.ReactElement[] {
    const lines = markdown.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const flushListItems = () => {
        if (listItems.length > 0) {
            listItems.forEach((item, idx) => {
                elements.push(
                    <View key={`list-${elements.length}-${idx}`} style={styles.listItemContainer}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={styles.listItem}>{item}</Text>
                    </View>
                );
            });
            listItems = [];
        }
    };

    const flushCodeBlock = () => {
        if (codeBlockContent.length > 0) {
            elements.push(
                <View key={`code-${elements.length}`} style={styles.codeBlock}>
                    <Text style={styles.codeText}>{codeBlockContent.join('\n')}</Text>
                </View>
            );
            codeBlockContent = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                flushCodeBlock();
                inCodeBlock = false;
            } else {
                flushListItems();
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // Skip empty lines but flush lists first
        if (!line.trim()) {
            flushListItems();
            continue;
        }

        // Handle headers
        if (line.startsWith('# ')) {
            flushListItems();
            elements.push(
                <Text key={`h1-${elements.length}`} style={styles.heading1}>
                    {line.substring(2).trim()}
                </Text>
            );
            continue;
        }

        if (line.startsWith('## ')) {
            flushListItems();
            elements.push(
                <Text key={`h2-${elements.length}`} style={styles.heading2}>
                    {line.substring(3).trim()}
                </Text>
            );
            continue;
        }

        if (line.startsWith('### ')) {
            flushListItems();
            elements.push(
                <Text key={`h3-${elements.length}`} style={styles.heading3}>
                    {line.substring(4).trim()}
                </Text>
            );
            continue;
        }

        // Handle blockquotes
        if (line.startsWith('>')) {
            flushListItems();
            elements.push(
                <View key={`quote-${elements.length}`} style={styles.blockquote}>
                    <Text style={styles.blockquoteText}>
                        {line.substring(1).trim()}
                    </Text>
                </View>
            );
            continue;
        }

        // Handle list items
        if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
            const itemText = line.replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '').trim();
            listItems.push(itemText);
            continue;
        }

        // Handle regular paragraphs
        flushListItems();
        // Clean up markdown formatting (bold, italic, links)
        const cleanText = line
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .trim();

        if (cleanText) {
            elements.push(
                <Text key={`p-${elements.length}`} style={styles.paragraph}>
                    {cleanText}
                </Text>
            );
        }
    }

    // Flush any remaining items
    flushListItems();
    flushCodeBlock();

    return elements;
}

export function ArticlePDFDocument({ title, markdown, generatedDate }: ArticlePDFDocumentProps) {
    const date = generatedDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const contentElements = parseMarkdownToElements(markdown);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.subtitle}>Generated Article</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>

                <View style={styles.content}>
                    {contentElements}
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Generated by Skywide • {date}
                    </Text>
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                        `Page ${pageNumber} of ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
}

export default ArticlePDFDocument;
