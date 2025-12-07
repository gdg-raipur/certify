export interface CertificateData {
    id: string;
    name: string;
    verifyLink?: string;
    design?: string;
    [key: string]: string | undefined;
}

export interface CsvColumnMapping {
    name: string;
    verifyLink: string;
    design: string;
    email?: string;
}
