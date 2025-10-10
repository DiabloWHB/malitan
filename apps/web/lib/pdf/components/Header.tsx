import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { commonStyles } from '../utils/styles';

interface HeaderProps {
  companyName: string;
  companyLogo?: string;
  documentTitle: string;
  documentNumber?: string;
  documentDate: string;
}

export const PDFHeader: React.FC<HeaderProps> = ({
  companyName,
  companyLogo,
  documentTitle,
  documentNumber,
  documentDate,
}) => {
  return (
    <View style={commonStyles.header}>
      {/* פרטי חברה */}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={[commonStyles.h2, { marginBottom: 5 }]}>
          {companyName}
        </Text>
        <Text style={commonStyles.textSmall}>{documentDate}</Text>
      </View>
      
      {/* לוגו */}
      {companyLogo && (
        <View style={{ width: 80, height: 60 }}>
          <Image src={companyLogo} style={{ width: '100%', height: '100%' }} />
        </View>
      )}
    </View>
  );
};