// lib/pdf/components/Footer.tsx

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from '../utils/styles';

interface FooterProps {
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  pageNumber?: boolean;
}

export const PDFFooter: React.FC<FooterProps> = ({
  companyName,
  companyPhone,
  companyEmail,
  pageNumber = true,
}) => {
  return (
    <View style={commonStyles.footer}>
      {/* שם החברה */}
      <Text style={{ marginBottom: 3, fontFamily: 'Rubik' }}>
        {companyName}
      </Text>
      
      {companyPhone && (
        <Text style={{ marginBottom: 3, fontFamily: 'Rubik' }}>
          טלפון: {companyPhone}
        </Text>
      )}
      
      {companyEmail && (
        <Text style={{ marginBottom: 3, fontFamily: 'Rubik' }}>
          דוא"ל: {companyEmail}
        </Text>
      )}
      
      {pageNumber && (
        <Text 
          style={{ marginTop: 5, fontFamily: 'Rubik' }}
          render={({ pageNumber, totalPages }) => 
            `עמוד ${pageNumber} מתוך ${totalPages}`
          }
          fixed
        />
      )}
    </View>
  );
};