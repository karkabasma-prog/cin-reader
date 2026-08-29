import type { CinResult } from "./ai-service.js";

export interface ValidationWarning {
  field: string;
  message: string;
}


function isValidDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  return true;
}


function parseDate(dateStr: string): Date | null {
  if (!isValidDate(dateStr)) return null;
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year!, month! - 1, day!);
}

export function validateCinResult(result: CinResult): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

 
  if (result.numero_cin) {
    const cinPattern = /^[A-Z]{1,2}\d{5,7}$/;
    if (!cinPattern.test(result.numero_cin)) {
      warnings.push({
        field: "numero_cin",
        message: "Le format du numéro de CIN semble inhabituel.",
      });
    }
  }


  if (result.date_naissance && !isValidDate(result.date_naissance)) {
    warnings.push({
      field: "date_naissance",
      message: "La date de naissance ne semble pas valide.",
    });
  }

  if (result.date_fin_validite && !isValidDate(result.date_fin_validite)) {
    warnings.push({
      field: "date_fin_validite",
      message: "La date de fin de validité ne semble pas valide.",
    });
  }

  if (result.date_naissance && result.date_fin_validite) {
    const birthDate = parseDate(result.date_naissance);
    const expiryDate = parseDate(result.date_fin_validite);

    if (birthDate && expiryDate && expiryDate <= birthDate) {
      warnings.push({
        field: "date_fin_validite",
        message: "La date de fin de validité devrait être postérieure à la date de naissance.",
      });
    }
  }

  return warnings;
}