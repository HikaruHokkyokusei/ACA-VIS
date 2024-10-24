import React from "react";

const PDFViewer = ({pdfUrl, searchText}) => {
    const url = `${pdfUrl}#page=${parseInt(searchText)+19}`
    return (
        <div>
            <iframe src={url} style={{ height: 600, width:900}} />
        </div>
    );
};
export default PDFViewer;