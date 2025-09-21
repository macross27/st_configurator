/**
 * English Language Pack
 *
 * English translations for the st_configurator application
 * Serves as fallback when Korean translations are not available.
 */

export default {
    // ========================================
    // Main Navigation & Actions
    // ========================================
    nav: {
        textureEditor: "Texture Editor",
        layers: "Layers",
        properties: "Properties",
        createOrder: "Create Order",
        export: "Export",
        import: "Import"
    },

    // ========================================
    // Layer Control Labels
    // ========================================
    controls: {
        size: "Size",
        scale: "Scale",
        rotation: "Rotation",
        flipHorizontal: "Flip Horizontal",
        color: "Color",
        opacity: "Opacity",
        position: "Position",
        xPosition: "X Position",
        yPosition: "Y Position"
    },

    // ========================================
    // Form Labels & Controls
    // ========================================
    form: {
        colorPicker: "Color Picker",
        textInput: "Text Input",
        imageUpload: "Upload Image",
        saveSession: "Save Session",
        loadSession: "Load Session",
        deleteAll: "Delete All",
        reset: "Reset",
        cancel: "Cancel",
        confirm: "Confirm",
        save: "Save",
        load: "Load",
        delete: "Delete",
        edit: "Edit",
        close: "Close"
    },

    // ========================================
    // Base Texture Section
    // ========================================
    baseTexture: {
        title: "Base Texture",
        primaryColor: "Primary Color",
        secondaryColor: "Secondary Color",
        pattern: "Pattern",
        material: "Material"
    },

    // ========================================
    // Layer Management
    // ========================================
    layers: {
        title: "Layers",
        addText: "Add Text",
        addLogo: "Add Logo",
        addImage: "Add Image",
        moveUp: "Move Up",
        moveDown: "Move Down",
        duplicate: "Duplicate",
        visible: "Visible",
        hidden: "Hidden",
        locked: "Locked",
        unlocked: "Unlocked",
        textLayer: "Text Layer",
        logoLayer: "Logo Layer",
        imageLayer: "Image Layer"
    },

    // ========================================
    // Order Form - Section Headers
    // ========================================
    order: {
        title: "Order Form",
        orderForm: "Order Form",
        selectedOptions: "Selected Options",
        customerInfo: "Customer Information",
        playerInfo: "Player Information",
        orderSummary: "Order Summary",
        specialRequests: "Special Requests",
        orderDetails: "Order Details"
    },

    // ========================================
    // Order Form - Field Labels
    // ========================================
    orderFields: {
        orderNumber: "Order Number",
        customerName: "Customer Name",
        contactInfo: "Contact Information",
        teamName: "Team Name",
        orderDate: "Order Date",
        deliveryDate: "Delivery Date",
        notes: "Notes"
    },

    // ========================================
    // Product Options
    // ========================================
    product: {
        uniform: "Uniform",
        neckType: "Neck Type",
        fabric: "Fabric",
        color: "Color",
        size: "Size",
        style: "Style"
    },

    // ========================================
    // Player Information
    // ========================================
    player: {
        number: "Number",
        name: "Player Name",
        position: "Position",
        configuration: "Configuration",
        sleeveType: "Sleeve Type",
        topSize: "Top Size",
        bottomSize: "Bottom Size",
        price: "Price"
    },

    // ========================================
    // Configuration Options
    // ========================================
    configuration: {
        setTopBottom: "Top & Bottom Set",
        topOnly: "Top Only",
        bottomOnly: "Bottom Only",
        shortSleeve: "Short Sleeve",
        longSleeve: "Long Sleeve",
        sleeveless: "Sleeveless"
    },

    // ========================================
    // Summary Labels
    // ========================================
    summary: {
        totalPlayers: "Total Players",
        totalSets: "Top & Bottom Sets",
        topsOnly: "Tops Only",
        bottomsOnly: "Bottoms Only",
        shortSleeveCount: "Short Sleeve",
        longSleeveCount: "Long Sleeve",
        totalPrice: "Total Price",
        subtotal: "Subtotal",
        tax: "Tax",
        shipping: "Shipping",
        discount: "Discount"
    },

    // ========================================
    // Action Buttons
    // ========================================
    actions: {
        addPlayer: "Add Player",
        deletePlayer: "Delete Player",
        editPlayer: "Edit Player",
        saveOrder: "Save Order",
        submitOrder: "Submit Order",
        printOrder: "Print Order",
        exportOrder: "Export Order"
    },

    // ========================================
    // Placeholders
    // ========================================
    placeholders: {
        enterCustomerName: "Enter customer name",
        enterContactInfo: "Enter contact information",
        enterTeamName: "Enter team name",
        enterPlayerNumber: "Player number",
        enterPlayerName: "Player name",
        selectSize: "Select size",
        enterSpecialRequests: "Enter any special requests",
        enterText: "Enter text",
        searchPlayers: "Search players"
    },

    // ========================================
    // Validation Messages
    // ========================================
    validation: {
        requiredField: "Required field",
        missingCustomerName: "Customer name",
        missingContactInfo: "Contact information",
        missingPlayerInfo: "At least one player information (name, number)",
        missingPlayerNumber: "Player number",
        missingTopSize: "Top size",
        missingBottomSize: "Bottom size",
        missingPlayerName: "Player name",
        invalidEmail: "Please enter a valid email address",
        invalidPhoneNumber: "Please enter a valid phone number",
        duplicatePlayerNumber: "Duplicate player number"
    },

    // ========================================
    // Validation Dialog
    // ========================================
    validationDialog: {
        title: "⚠️ Required Information",
        message: "Please enter the following information to save the order:",
        requiredInfo: "📝 Required Information",
        playerInfoSection: "👥 Player Information",
        pleaseCompleteInfo: "Please complete the above information and try saving again."
    },

    // ========================================
    // Success Messages
    // ========================================
    success: {
        orderSaved: "Order has been saved.",
        sessionRestored: "Session has been restored!",
        layerAdded: "Layer has been added.",
        layerDeleted: "Layer has been deleted.",
        textureApplied: "Texture has been applied.",
        configurationSaved: "Configuration has been saved.",
        imageUploaded: "Image has been uploaded.",
        orderSubmitted: "Order has been submitted."
    },

    // ========================================
    // Error Messages
    // ========================================
    errors: {
        // Legacy error messages
        fileSizeExceeded: "File size exceeded",
        fileSizeMessage: "The file size exceeds the maximum allowed limit and cannot be used.",
        unsupportedFileType: "Unsupported file type.",
        uploadFailed: "Upload failed.",
        networkError: "Network error occurred.",
        serverError: "Server error occurred.",
        orderSaveFailed: "❌ Order save failed: {error}",
        sessionIdMissing: "Session ID is missing.",
        serverUnavailable: "Server connection is not available.",
        submissionFailed: "Submission failed: {error}",
        loadingFailed: "Loading failed.",
        processingError: "Processing error occurred.",
        appInitializationFailed: "Application initialization failed.",
        recoveryFailed: "Error recovery failed.",

        // Standardized error messages
        genericError: "An unexpected error occurred: {error}",
        runtimeError: "A script runtime error occurred",
        unhandledRejection: "An unhandled error occurred",

        // Security errors
        security: {
            cspViolation: "Content Security Policy violation detected",
            unauthorizedAccess: "Unauthorized access attempt",
            invalidToken: "Authentication token is invalid",
            sessionExpired: "Session has expired"
        },

        // Network errors
        network: {
            connectionFailed: "Failed to connect to server",
            requestTimeout: "Request timeout",
            serverUnavailable: "Server is unavailable",
            badRequest: "Bad request",
            forbidden: "Access forbidden",
            notFound: "Requested resource not found",
            serverError: "Internal server error",
            networkTimeout: "Network connection timeout"
        },

        // File processing errors
        file: {
            fileTooLarge: "File size is too large ({fileName})",
            unsupportedFormat: "Unsupported file format ({fileName})",
            uploadFailed: "File upload failed ({fileName})",
            processingFailed: "File processing failed ({fileName})",
            corruptedFile: "File is corrupted or unreadable ({fileName})",
            readError: "Error reading file ({fileName})",
            conversionFailed: "File conversion failed ({fileName})",
            configLoadFailed: "Failed to load configuration file. Please check the file format.",
            batchProcessingFailed: "Batch processing error occurred ({fileName})"
        },

        // Layer management errors
        layer: {
            createFailed: "Layer creation failed ({layerId})",
            updateFailed: "Layer update failed ({layerId})",
            deleteFailed: "Layer deletion failed ({layerId})",
            loadFailed: "Layer loading failed ({layerId})",
            renderFailed: "Layer rendering failed ({layerId})",
            lockFailed: "Layer lock failed ({layerId})",
            duplicateFailed: "Layer duplication failed ({layerId})",
            layerNotFound: "Layer not found ({layerId})"
        },

        // Session management errors
        session: {
            createFailed: "Session creation failed",
            saveFailed: "Session save failed",
            loadFailed: "Session load failed",
            deleteFailed: "Session deletion failed",
            expiredSession: "Session has expired",
            invalidSession: "Invalid session",
            sessionNotFound: "Session not found",
            sessionRestoreFailed: "Session restore failed"
        },

        // Texture processing errors
        texture: {
            createFailed: "Texture creation failed",
            updateFailed: "Texture update failed",
            loadFailed: "Texture loading failed",
            renderFailed: "Texture rendering failed",
            exportFailed: "Texture export failed",
            memoryError: "Texture memory error"
        },

        // 3D model errors
        model: {
            loadFailed: "3D model loading failed",
            renderFailed: "3D model rendering failed",
            invalidFormat: "Unsupported 3D model format",
            missingFile: "3D model file not found"
        },

        // Order processing errors
        order: {
            validationFailed: "Order validation failed",
            saveFailed: "Order save failed",
            submitFailed: "Order submission failed",
            loadFailed: "Order loading failed",
            emailFailed: "Order email sending failed"
        },

        // UI errors
        ui: {
            colorPickerFailed: "Color picker initialization failed",
            clipboardFailed: "Clipboard access failed",
            clipboardCopyFailed: "Clipboard copy failed",
            renderFailed: "UI rendering failed",
            layoutFailed: "Layout processing failed"
        },

        // Error recovery actions
        actions: {
            retryUpload: "Retry Upload",
            retryConnection: "Reconnect",
            recoverSession: "Recover Session",
            recreateLayer: "Recreate Layer",
            reloadPage: "Reload Page",
            contactSupport: "Contact Support",
            reportBug: "Report Bug",
            clearCache: "Clear Cache"
        }
    },

    // ========================================
    // Status Messages
    // ========================================
    status: {
        loading: "Loading...",
        saving: "Saving...",
        processing: "Processing...",
        uploading: "Uploading...",
        downloading: "Downloading...",
        ready: "Ready",
        complete: "Complete",
        failed: "Failed",
        updatingSessionInfo: "Updating session information...",
        processingSubmission: "Processing submission..."
    },

    // ========================================
    // Conversion/Processing Messages
    // ========================================
    conversion: {
        resolutionConverted: "Resolution has been converted from {originalWidth}×{originalHeight} to {newWidth}×{newHeight} with file size of {fileSize}KB.",
        imageOptimized: "Image has been optimized.",
        formatConverted: "File format has been converted."
    },

    // ========================================
    // Submission Messages
    // ========================================
    submission: {
        success: "Work has been successfully submitted!\n\nShare URL: {url}\n\nClick the URL to copy to clipboard.",
        urlCopied: "URL has been copied to clipboard.",
        shareTitle: "Share"
    },

    // ========================================
    // File Names
    // ========================================
    fileNames: {
        orderPrefix: "Order_",
        orderInfoPrefix: "OrderInfo_",
        sessionPrefix: "Session_",
        exportPrefix: "Export_"
    },

    // ========================================
    // Units
    // ========================================
    units: {
        currency: "USD",
        people: " people",
        items: " items",
        pieces: " pieces",
        sets: " sets",
        cm: "cm",
        mm: "mm",
        inch: "inch",
        degrees: "°"
    },

    // ========================================
    // Default Product Options
    // ========================================
    defaultProduct: {
        uniform: "ST Custom_1",
        neckType: "Standard Neck",
        fabric: "Pro Active"
    },

    // ========================================
    // Accessibility Labels
    // ========================================
    accessibility: {
        skipToMain: "Skip to main content",
        appContainer: "3D Uniform Configurator Application",
        mainContent: "3D Uniform Preview and Controls",
        previewViewport: "3D Preview Viewport",
        threeDPreview: "3D uniform preview - use arrow keys to rotate view, plus/minus to zoom",
        colorWheel: "Color wheel - click or use arrow keys to select hue and saturation",
        brightnessSlider: "Brightness slider",
        resetView: "Reset 3D view to default state",
        layerControls: "Layer property controls",
        textureEditorControls: "Texture editor controls",
        closeDialog: "Close dialog",
        openColorPicker: "Open color picker",
        fieldOfView: "Field of view angle in degrees",
        layerScale: "Layer scale from 0.1 to 3.0",
        layerRotation: "Layer rotation angle in degrees",
        addNewLayers: "Add new layers",
        exportAndOrderActions: "Export and order actions",
        textureLayersList: "Texture layers list",
        addNewTextLayer: "Add new text layer",
        addNewLogoLayer: "Add new logo layer",
        createOrderForm: "Create order form for current configuration",
        submitConfiguration: "Submit current configuration"
    },

    // ========================================
    // Keyboard Help
    // ========================================
    keyboard: {
        title: "Keyboard Shortcuts",
        navigation: "Navigation",
        tabNavigate: "Tab - Navigate between controls",
        arrowKeys: "Arrow keys - Navigate 3D view/menus",
        enterSpace: "Enter/Space - Activate buttons",
        deleteKey: "Delete - Remove selected layer",
        reorderLayers: "Ctrl+↑/↓ - Reorder layers",
        selectLayer: "Ctrl+1-9 - Select layer by number",
        zoom: "+/- - Zoom in 3D view",
        escape: "Esc - Close dialogs/clear selection"
    },

    // ========================================
    // Dialog Titles
    // ========================================
    dialogs: {
        colorPicker: "Color Picker",
        layerColorPicker: "Layer Color Picker",
        fieldOfViewControls: "Field of View Controls",
        layerPropertyControls: "Layer Property Controls",
        orderFormDialog: "Order Form Dialog",
        sessionManager: "Session Manager",
        confirmDelete: "Confirm Delete",
        confirmReset: "Confirm Reset"
    },

    // ========================================
    // Confirmation Messages
    // ========================================
    confirmations: {
        deleteLayer: "Are you sure you want to delete this layer?",
        deleteAllLayers: "Are you sure you want to delete all layers?",
        resetConfiguration: "Are you sure you want to reset all settings?",
        discardChanges: "Are you sure you want to discard changes?",
        overwriteSession: "Are you sure you want to overwrite the existing session?",
        exitWithoutSaving: "Are you sure you want to exit without saving?"
    },

    // ========================================
    // Tooltips
    // ========================================
    tooltips: {
        addTextLayer: "Add text layer",
        addLogoLayer: "Add logo layer",
        deleteLayer: "Delete layer",
        moveLayerUp: "Move layer up",
        moveLayerDown: "Move layer down",
        toggleVisibility: "Toggle visibility",
        lockLayer: "Lock/unlock layer",
        resetView: "Reset view to default state",
        saveSession: "Save current work state as session",
        loadSession: "Load saved session"
    },

    // ========================================
    // Language Settings
    // ========================================
    language: {
        name: "English",
        code: "en",
        direction: "ltr",
        fontFamily: "system-ui"
    }
};