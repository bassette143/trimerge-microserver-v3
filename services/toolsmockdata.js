
let mockToolsData = {
  "tools": {
    "staff": {
      "69f506e2b4859eff3993f55e": {
        "tool": [
          {
            "name": "create_api_endpoint",
            "description": "Creates a new backend API endpoint.",
            "arguments": {
              "route": {
                "type": "string",
                "description": "API route path"
              },
              "method": {
                "type": "string",
                "description": "HTTP method such as GET or POST"
              }
            }
          },
          {
            "name": "test_database_connection",
            "description": "Tests database connectivity and response.",
            "arguments": {
              "database_name": {
                "type": "string",
                "description": "Name of the database"
              }
            }
          }
        ]
      },
      "69fb593382b65374e740619e": {
        "tool": [
          {
            "name": "create_ui_component",
            "description": "Creates a frontend UI component.",
            "arguments": {
              "component_name": {
                "type": "string",
                "description": "Name of the UI component"
              }
            }
          },
          {
            "name": "update_page_design",
            "description": "Updates styling or layout for a page.",
            "arguments": {
              "page_name": {
                "type": "string",
                "description": "Name of the page to update"
              }
            }
          }
        ]
      }
    }
  }
}

module.exports = { mockToolsData };
