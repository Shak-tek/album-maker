import React from 'react';

export default function UploadStepContent({ fileInputRef }) {
    return (
        <div className="sc-8340680b-1 alxti">
            <div className="sc-c375d746-0 drLlWj">
                <div className="StyledBox-sc-13pk1d4-0 ejlvja sc-64a41707-0 kgaqOo">
                    <div className="sc-64a41707-3 bLARkw" data-cy="uploadDropzone">
                        <div className="sc-64a41707-6 gRJaFm">
                            <div className="sc-e9a95c96-0 ivBgEQ PreviewsContainer">
                                <div
                                    tabIndex="0"
                                    className="StyledBox-sc-13pk1d4-0 eShssG sc-6e7583d-0 gliyBa"
                                >
                                    <div>
                                        <span
                                            className="sc-1215e251-0 hoiuWp"
                                            style={{ width: 24, height: 24 }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                width="24"
                                                height="24"
                                            >
                                                <path
                                                    fill="#585858"
                                                    fillRule="evenodd"
                                                    d="M10.598 1.491c-.098.193-.098.445-.098.949v8.06H2.44c-.504 0-.756 0-.949.098a.9.9 0 0 0-.393.393C1 11.184 1 11.436 1 11.94v.12c0 .504 0 .756.098.949a.9.9 0 0 0 .393.393c.193.098.445.098.949.098h8.06v8.06c0 .504 0 .756.098.949a.9.9 0 0 0 .393.393c.193.098.445.098.949.098h.12c.504 0 .756 0 .949-.098a.9.9 0 0 0 .393-.393c.098-.193.098-.445.098-.949V13.5h8.06c.504 0 .756 0 .949-.098a.9.9 0 0 0 .393-.393c.098-.193.098-.445.098-.949v-.12c0-.504 0-.756-.098-.949a.9.9 0 0 0-.393-.393c-.193-.098-.445-.098-.949-.098H13.5V2.44c0-.504 0-.756-.098-.949a.9.9 0 0 0-.393-.393C12.816 1 12.564 1 12.06 1h-.12c-.504 0-.756 0-.949.098a.9.9 0 0 0-.393.393"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            className="sc-62126082-4 ilrNdx"
                            data-cy="uploadButton"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div className="StyledBox-sc-13pk1d4-0 jgFRfK sc-62126082-2">
                                <div className="StyledBox-sc-13pk1d4-0 ifTYYE">
                                    Select Photos
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
