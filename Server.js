const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'IoT Private Cloud API is running'
    });
});

app.post('/api/telemetry', async (req, res) => {
    try {
        const { device_id, temperature_c, seq } = req.body;

        if (!device_id) {
            return res.status(400).json({
                success: false,
                message: 'device_id is required'
            });
        }

        if (typeof temperature_c !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'temperature_c must be a number'
            });
        }

        if (!Number.isInteger(seq)) {
            return res.status(400).json({
                success: false,
                message: 'seq must be an integer'
            });
        }

        const { data, error } = await supabase
            .from('telemetry')
            .insert([
                {
                    device_id,
                    temperature_c,
                    seq
                }
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save temperature',
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Temperature saved successfully',
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.get('/api/telemetry', async (req, res) => {
    const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);

    if (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get telemetry',
            error: error.message
        });
    }

    res.json({
        success: true,
        data
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});