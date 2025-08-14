public inherited sharing class ObjectController {
    public static final List<String> primitiveDataTypeCastList = new List<String>{'BOOLEAN', 'DATE', 'DATETIME', 'DOUBLE', 'INT'};

    /*** ~~~~~~ SECTION 1: These methods are used for loading the sObject + field info ~~~~~~ */
    @AuraEnabled(cacheable = true)
    public static String getObjectList(String dmlType){
        List<List<String>> sObjectList = new List<List<String>>();
        
        for(Schema.SObjectType o : Schema.getGlobalDescribe().values()){
            Schema.DescribeSObjectResult obj = o.getDescribe();

            // sObject security for context of current user
            if(obj.isAccessible() && (obj.getAssociateEntityType() == null) && (obj.queryable == true)) {
                String[] picklistOption = new List<String>();
                if(dmlType != null) {
                    switch on dmlType {
                        when 'insert' {
                            if(obj.isCreateable()){
                                picklistOption = createPicklistOption(obj, dmlType);
                            }
                        }
                        when 'update' {
                            if(obj.isUpdateable()){
                                picklistOption = createPicklistOption(obj, dmlType);
                            }
                        }
                        when 'upsert'{
                            if(obj.isCreateable() && obj.isUpdateable()){
                                picklistOption = createPicklistOption(obj, dmlType);
                            }
                        }
                        when 'xdelete'{
                            if(obj.isDeletable()){
                                picklistOption = createPicklistOption(obj, dmlType);
                            }
                        }
                        when 'xundelete'{
                            if(obj.isUndeletable()){
                                picklistOption = createPicklistOption(obj, dmlType);
                            }
                        }
                    }
                } else {
                    picklistOption = createPicklistOption(obj, dmlType);
                }
                if(!picklistOption.isEmpty() && picklistOption != null){
                    sObjectList.add(picklistOption);
                }
            }
        }
       
        return JSON.serialize(sObjectList);
    }

    private static String[] createPicklistOption(Schema.DescribeSObjectResult obj, String dmlType){
        String[] picklistOption = new List<String>{obj.getLabel(), obj.getName()};
        FieldDetail[] fieldApiNames = new List<FieldDetail>();

        if(obj.fields.getMap().values() != null && obj.fields.getMap().values().size() > 0){
            for(Schema.SObjectField f : obj.fields.getMap().values()){
                // field level security for context of current user
                if(f.getDescribe().isAccessible()){
                    Schema.DescribeFieldResult field = f.getDescribe();
                    if(dmlType != null) {
                        switch on dmlType {
                            when  'insert'{
                                if(field.isCreateable()){
                                    FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                                }
                            }
                            when 'update'{
                                if(field.isCreateable() || field.isUpdateable() || field.getName() == 'Id'){
                                    FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                                }
                            }
                            when 'upsert'{
                                if(field.isCreateable() || field.isUpdateable() || field.getName() == 'Id'){
                                    FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                                }
                            }
                            when 'xdelete'{
                                if(field.getName() == 'Id'){
                                    FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                                }
                            }
                            when 'xundelete'{
                                if(field.getName() == 'Id'){
                                    FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                                }
                            }
                        }
                
                    } else {
                        FieldDetail fd = new FieldDetail(
                                        field.getLabel(),
                                        field.getName(),
                                        String.valueOf(field.getType())
                                    );
                                    fieldApiNames.add(fd);
                    }
                }
            }
        }

        if(!fieldApiNames.isEmpty() && fieldApiNames.size() > 0){
            picklistOption.add(JSON.serialize(fieldApiNames));
        }

        if(picklistOption.size() >= 3){ // only include the sObject if there are > 0 fields available for DML selected
            return picklistOption;
        }else{
            return null;
        }
        
    }
    /*** ~~~~~~ END of SECTION 1 ~~~~~~ */

    /*** ~~~~~~ SECTION 2: These methods are used for saving / loading / deleting field maps ~~~~~~ */
    /*@AuraEnabled
    public static String saveFieldMapping(Id existingRecordId, String name, String objectName, String mappedFields){
        Saved_Field_Mapping__c fm = new Saved_Field_Mapping__c();
        fm.Mapped_Fields__c = '';
        List<String> fieldMappings = (List<String>)JSON.deserialize(mappedFields, List<String>.class);
        
        for(String f : fieldMappings){
            fm.Mapped_Fields__c += f.trim() + '\n';
        }
        try{
            if(existingRecordId == null){
                fm.Name = name;
                fm.Object__c = objectName;
                insert fm;
                return 'saved';
            }else{
                fm.Name = name;
                fm.Id = existingRecordId;
                update fm;
                return 'updated';
            }
        }catch(System.DmlException e){
            return JSON.serialize(e);
        }
    }

    @AuraEnabled 
    public static String deleteFieldMapping(Id recordId){
        Saved_Field_Mapping__c toDelete = new Saved_Field_Mapping__c(
            Id = recordId
        );

        delete toDelete;
        return 'Deleted';
    }

    @AuraEnabled
    public static String loadFieldMapping(String name, String objectName){
        List<Saved_Field_Mapping__c> fieldMap = [SELECT Id, Name, Object__c, Mapped_Fields__c FROM Saved_Field_Mapping__c WHERE Name =: name AND Object__c =: objectName];
        if(fieldMap.size() == 0){
            return null;
        }else{
            return JSON.serialize(fieldMap[0]);
        }
    }

    @AuraEnabled 
    public static String loadAllFieldMappings(){
        return JSON.serialize([SELECT Id, Name, Object__c, Mapped_Fields__c, CreatedDate, CreatedBy.Name FROM Saved_Field_Mapping__c ORDER BY Object__c, Name]);
    }*/
    /*** ~~~~~~ END of SECTION 2 ~~~~~~ */


    /*** ~~~~~~ SECTION 3: These methods are used for executing DML ~~~~~~ */
    @AuraEnabled 
    public static String executeDML(String objectName, String dmlType, String fieldMap, String csvData){
        Map<String, String> fieldDataTypeMap = new Map<String, String>();
        Map<String, String> mappedFieldsMap = new Map<String, String>();
        List<sObject> recordsToProcess = new List<sObject>();

        objectName = objectName.replace('"',''); // i.e., "Lead" => Lead
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectName);

        // Populate sObject Field Map with <FieldName, Data Type>
        Schema.DescribeSObjectResult[] objectDetails = Schema.describeSObjects(new String[]{objectName});
        
        if(objectDetails != null && objectDetails.size() > 0){
            for(Schema.SObjectField f : objectDetails[0].fields.getMap().values()){
                fieldDataTypeMap.put(String.valueOf(f), String.valueOf(f.getDescribe().getType()));
            }
        }
        
        // Populate CSV <> sObject Field Mapping Pairs
        List<FieldMapping> mappings = (List<FieldMapping>)JSON.deserialize(fieldMap, List<FieldMapping>.class);
        for(FieldMapping fm : mappings){
            mappedFieldsMap.put(fm.csvHeader, fm.value);
        }
        
        // Deserialize the CSV Row Data into sObjects
        List<Object> data = (List<Object>)JSON.deserializeUntyped(csvData);

        // Iterate through each row
        for(Integer i = 0; i < data.size(); i++){
            Map<String, Object> csvRow = (Map<String, Object>)data[i];
            Integer fieldsMapped = 0;
            SObject record = objectType.newSObject(); // i.e., type = Lead
            String recordString = '{"Data": {"attributes": {"type": "' + objectType + '"}, ';
            
            // Map each field based the selected field mapping pairs
            for(String fieldName : csvRow.keySet()){
                if(mappedFieldsMap.containsKey(fieldName)){
                    fieldsMapped += 1;

                    String fieldValue = String.valueOf(csvRow.get(fieldName)).replace('"','');
                    String sObjectField = mappedFieldsMap.get(fieldName);
                    String fieldDataType = fieldDataTypeMap.get(sObjectField);

                    // Check data type of mapped field to see if it should be casted 
                    if(primitiveDataTypeCastList.contains(fieldDataType) && !String.isBlank(fieldValue)){
                        String convertedValue = convertFieldValue(fieldDataType, fieldValue);
                        recordString += '"' + sObjectField + '" : "' + convertedValue + '"';
                    }else{
                        recordString += '"' + sObjectField + '" : "' + fieldValue + '"';
                    }
                    
                    // Continue looping through the CSV columns for # of mapped fields
                    if(fieldsMapped != mappedFieldsMap.keySet().size()){
                        recordString += ', ';
                    }
                }
            }

            recordString += '}}';

            // Convert the String into an sObject
            Map<String, Object> recordStringMap = (Map<String, Object>)JSON.deserializeUntyped(recordString);
            String objJSON = JSON.serialize(recordStringMap.get('Data'));
            Map<String, Object> recordJSON = (Map<String, Object>)JSON.deserializeUntyped(objJSON);
            String recordJSONString = JSON.serialize(recordJSON);
            
            try{
                SObject so = (SObject)JSON.deserialize(recordJSONString, sObject.class);
                recordsToProcess.add(so);
            }catch(Exception ex){
                System.debug(ex.getMessage());
            } 
        }

        DmlResult[] results = new List<DmlResult>();
        dmlType = dmlType.toLowerCase();

        switch on dmlType {
            when 'insert'{
                results = getSaveResults(recordsToProcess, 'insert');
            }
            when 'update'{
                results = getSaveResults(recordsToProcess, 'update');
            }
            when 'upsert'{
                results = getUpsertResults(recordsToProcess);
            }
            when 'xdelete'{
                results = getDeleteResults(recordsToProcess);
            }
            when 'xundelete'{
                results = getUndeleteResults(recordsToProcess);
            }
        }

        return JSON.serialize(results);
    }

    private static List<DmlResult> getSaveResults(List<sObject> recordsToProcess, String dmlType){
        Database.SaveResult[] results = new List<Database.SaveResult>();
        DmlResult[] dmlResults = new List<DmlResult>();

        if(dmlType == 'insert'){
            results = Database.insert(recordsToProcess, false);
        }else if(dmlType == 'update'){
            results = Database.update(recordsToProcess, false);
        }
        
        for(Integer i = 0; i < results.size(); i++){
            Database.SaveResult result = results.get(i);

            if(result.isSuccess()){
                DmlResult dr = new DmlResult('Success', null, recordsToProcess[i]);
                dmlResults.add(dr);
            }else{
                String errorMessage = ' ';
                for(Database.Error e : result.getErrors()){
                    errorMessage += e.getMessage() + '. ';
                }
                DmlResult dr = new DmlResult('Error', errorMessage, recordsToProcess[i]);
                dmlResults.add(dr);
            }
        }
        return dmlResults;
    }

    private static List<DmlResult> getUpsertResults(List<sObject> recordsToProcess){
        Database.UpsertResult[] results = Database.upsert(recordsToProcess, false);
        DmlResult[] dmlResults = new List<DmlResult>();

        for(Integer i = 0; i < results.size(); i++){
            Database.UpsertResult result = results.get(i);

            if(result.isSuccess()){
                DmlResult dr = new DmlResult('Success', null, recordsToProcess[i]);
                dmlResults.add(dr);
            }else{
                String errorMessage = ' ';
                for(Database.Error e : result.getErrors()){
                    errorMessage += e.getMessage() + '. ';
                }
                DmlResult dr = new DmlResult('Error', errorMessage, recordsToProcess[i]);
                dmlResults.add(dr);
            }
        }
        return dmlResults;
    }

    private static List<DmlResult> getDeleteResults(List<sObject> recordsToProcess){
        Database.DeleteResult[] results = Database.delete(recordsToProcess, false);
        DmlResult[] dmlResults = new List<DmlResult>();

        for(Integer i = 0; i < results.size(); i++){
            Database.DeleteResult result = results.get(i);

            if(result.isSuccess()){
                DmlResult dr = new DmlResult('Success', null, recordsToProcess[i]);
                dmlResults.add(dr);
            }else{
                String errorMessage = ' ';
                for(Database.Error e : result.getErrors()){
                    errorMessage += e.getMessage() + '. ';
                }
                DmlResult dr = new DmlResult('Error', errorMessage, recordsToProcess[i]);
                dmlResults.add(dr);
            }
        }
        return dmlResults;
    }

    private static List<DmlResult> getUndeleteResults(List<sObject> recordsToProcess){
        Database.UndeleteResult[] results = Database.undelete(recordsToProcess, false);
        DmlResult[] dmlResults = new List<DmlResult>();

        for(Integer i = 0; i < results.size(); i++){
            Database.UndeleteResult result = results.get(i);

            if(result.isSuccess()){
                DmlResult dr = new DmlResult('Success', null, recordsToProcess[i]);
                dmlResults.add(dr);
            }else{
                String errorMessage = ' ';
                for(Database.Error e : result.getErrors()){
                    errorMessage += e.getMessage() + '. ';
                }
                DmlResult dr = new DmlResult('Error', errorMessage, recordsToProcess[i]);
                dmlResults.add(dr);
            }
        }
        return dmlResults;
    }

    private static String convertFieldValue(String dataType, String fieldValue){
        dataType = dataType.toUpperCase();

        switch on dataType{
            when 'BOOLEAN'{ return String.valueOf(Boolean.valueOf(fieldValue)); }
            when 'DATE'{ return String.valueOf(Date.valueOf(fieldValue)); }
            when 'DATETIME'{ return String.valueOf(DateTime.valueOf(fieldValue)); }
            when 'DOUBLE'{ return String.valueOf(Double.valueOf(fieldValue)); }
            when 'INT'{ return String.valueOf(Integer.valueOf(fieldValue)); }
        }

        return null;
    }

    private class FieldMapping{
        public String csvHeader {get; set;}
        public String value {get; set;}
    }

    private class DmlResult{
        public String status {get; set;}
        public String comments {get; set;}
        public sObject obj {get; set;}

        public DmlResult(String s, String c, sObject o){
            this.status = s;
            this.comments = c;
            this.obj = o;
        }
    }

    public class FieldDetail{
        @AuraEnabled public String label {get; set;}
        @AuraEnabled public String value {get; set;}
        @AuraEnabled public String type {get; set;}

        public FieldDetail(String l, String v, String t){
            this.label = l;
            this.value = v;
            this.type = t;
        }
    }
    /*** ~~~~~~ END of SECTION 3 ~~~~~~ */
}