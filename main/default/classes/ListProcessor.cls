public without sharing class ListProcessor {
    @InvocableMethod(label='Create List View' description='Create an object list view')
    public static List<Response> checkForListView(List<Request> request) {
        Details details = request[0].details;

        String listViewApiName = details.apiName;
        List<ListView> listViews = [SELECT Id, DeveloperName FROM ListView WHERE DeveloperName =: details.objectApiName];

        Response res = new Response();
        
        //if (listViews.isEmpty()) {
            //res.message = 'A list view with this API name already exists';
        //}
		
        ListViewDetails lvd = new ListViewDetails();
        lvd.label = details.label;
        lvd.apiName = details.apiName;
        lvd.objectApiName = details.objectApiName;
        lvd.fieldApiNames = details.fieldApiNames;
        
        res.details = lvd;
        return new List<Response>{res};
    }

    public class Request {
        @InvocableVariable(required=true)
        public Details details;
    } 

    public class Details {
        @InvocableVariable(required=true)
        public String label;

        @InvocableVariable(required=true)
        public String apiName;

        @InvocableVariable(required=true)
        public String objectApiName;

        @InvocableVariable(required=true)
        public List<String> fieldApiNames;
    }

    public class Response {
        @InvocableVariable(required=true)
        public ListViewDetails details;
    }
    
    public class ListViewDetails {
        @InvocableVariable(required=true)
        public String label;

        @InvocableVariable(required=true)
        public String apiName;

        @InvocableVariable(required=true)
        public String objectApiName;

        @InvocableVariable(required=true)
        public List<String> fieldApiNames;
    }
}